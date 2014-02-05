describe('Assembler.LayoutView', function() {
    BaseView = Assembler.View;
    _.extend(BaseView.prototype, Assembler.HandlebarsMixin);

    var LayoutView = Assembler.LayoutView;

    var layoutView;

    beforeEach(function(){
        layoutView = new LayoutView();
    });

    describe('.constructor()', function() {
        it('should initialize .views to an empty list', function() {
            layoutView.views.length.should.eql(0);
        });

        it('should call super.constructor()', function() {
            var constructorStub = sinon.stub(BaseView.prototype, "constructor");

            layoutView = new LayoutView();

            constructorStub.should.have.been.called.once;
            constructorStub.restore();
        });
    });

    describe('.initialize()', function() {
        it('should call super.initialize()', function() {
            var initializeStub = sinon.stub(BaseView.prototype, "initialize");

            layoutView = new LayoutView();

            initializeStub.should.have.been.called.once;
            initializeStub.restore();
        });

        it('should set .viewEvents from options', function() {
            var testCallback = function() {};
            var viewEvents = { 'test': testCallback };

            layoutView = new LayoutView({
                viewEvents: viewEvents
            });

            layoutView.viewEvents.should.have.keys(['test']);
            layoutView.viewEvents.should.have.property('test', testCallback);
        });

        it('should reset views to those supplied',  function() {
            var testView = new Backbone.View();
            var destination = 'append .destination';
            var views = {};
            views[destination] = testView;

            layoutView = new LayoutView({
                views: views
            });

            layoutView.getView(destination).should.eql(testView);
        });
    });

    describe('.delegateViewEvents()', function() {
        it('should listen to all .viewEvents on view', function() {
            var testView = new Backbone.View();
            layoutView.addView('append .destination', testView);
            var testCallback = sinon.spy();
            layoutView.viewEvents = { 'test': testCallback };

            layoutView.delegateViewEvents(testView);
            testView.trigger('test');

            testCallback.should.have.been.calledOnce;
        });
    });

    describe('.undelegateViewEvents()', function() {
        it('should not respond to any .viewEvents on view', function() {
            var testView = new Backbone.View();
            layoutView.addView('append .destination', testView);
            var testCallback = sinon.spy();
            layoutView.viewEvents = { 'test': testCallback };

            layoutView.undelegateViewEvents(testView);
            testView.trigger('test');

            testCallback.should.not.have.been.called;
        });
    });

    describe('.addView()', function() {
        var testView;
        beforeEach(function() {
            layoutView = new LayoutView({
                template: '<div class="destination"><hr></div>'
            });
            testView = new Backbone.View();

        });

        it('should add the view to inner', function() {
            var destination = 'inner .destination';

            layoutView.addView(destination, testView);
            layoutView.attach().render();

            layoutView.$el.html().should.eql('<div class="destination"><div></div></div>');
        });

        it('should add the view to outer', function() {
            var destination = 'outer .destination';

            layoutView.addView(destination, testView);
            layoutView.attach().render();

            layoutView.$el.html().should.eql('<div></div>');
        });

        it('should add the view by prepend', function() {
            var destination = 'prepend .destination';

            layoutView.addView(destination, testView);
            layoutView.attach().render();

            layoutView.$el.html().should.eql('<div class="destination"><div></div><hr></div>');
        });

        it('should add the view by append', function() {
            var destination = 'append .destination';

            layoutView.addView(destination, testView);
            layoutView.attach().render();

            layoutView.$el.html().should.eql('<div class="destination"><hr><div></div></div>');
        });

        it('should add the view before', function() {
            var destination = 'before .destination';

            layoutView.addView(destination, testView);
            layoutView.attach().render();

            layoutView.$el.html().should.eql('<div></div><div class="destination"><hr></div>');
        });

        it('should add the view after', function() {
            var destination = 'after .destination';

            layoutView.addView(destination, testView);
            layoutView.attach().render();

            layoutView.$el.html().should.eql('<div class="destination"><hr></div><div></div>');
        });

        it('should delegate the view events to the view', function() {
            var testCallback = sinon.spy();
            layoutView.viewEvents = { 'test': testCallback };

            layoutView.addView('append .destination', testView);

            testView.trigger('test');

            testCallback.should.have.been.calledOnce;
        });

        it('should set the views parent to this', function() {
            var destination = 'after .destination';

            layoutView.addView(destination, testView);
            testView.parentView.should.eql(layoutView);
        });

        it('should keep the order they are added when rendering', function() {
            var testView2 = new Backbone.View({ className: "test2"});
            var destination = 'append .destination';

            layoutView.addView(destination, testView);
            layoutView.addView(destination, testView2);

            layoutView.attach().render();

            layoutView.$el.html().should.eql('<div class="destination"><hr><div></div><div class="test2"></div></div>');
        });

        it('should return the view supplied', function() {
            var destination = 'append .destination';

            layoutView.addView(destination, testView).should.eql(testView);
        });
    });

    describe('.removeView()', function() {
        var viewToRemove, destination;
        beforeEach(function() {
            layoutView = new LayoutView({
                template: '<div class="destination"><hr></div>'
            });

            viewToRemove = new Backbone.View();
            destination = 'append .destination';
            layoutView.addView(destination, viewToRemove);
        });

        it('should remove the view from the destination', function() {
            layoutView.removeView(destination);

            should.equal(layoutView.getView(destination), undefined);
        });

        it('should unset the parent view from the view', function() {
            layoutView.removeView(destination);

            should.equal(viewToRemove.parentView, undefined);
        });

        it('should not break the partial method', function() {
            var someMoreViews = [
                { view: new Backbone.View({ className: "more1"}), destination: 'append .destination' },
                { view: new Backbone.View({ className: "more2"}), destination: 'append .destination' }
            ];
            layoutView.addView(someMoreViews[0].destination, someMoreViews[0].view);
            layoutView.addView(someMoreViews[1].destination, someMoreViews[1].view);
            layoutView.render();

            layoutView.partial('append', '.destination', 0, 3)[0].should.eql(viewToRemove.$el[0]);
            layoutView.partial('append', '.destination', 1, 3)[0].should.eql(someMoreViews[0].view.$el[0]);
            layoutView.partial('append', '.destination', 2, 3)[0].should.eql(someMoreViews[1].view.$el[0]);

            layoutView.removeView(viewToRemove);

            layoutView.partial('append', '.destination', 0, 2)[0].should.eql(someMoreViews[0].view.$el[0]);
            layoutView.partial('append', '.destination', 1, 2)[0].should.eql(someMoreViews[1].view.$el[0]);
        });

        it('should undelegate events from the view', function() {
            var testCallback = sinon.spy();
            layoutView.viewEvents = { 'test': testCallback };

            layoutView.removeView(viewToRemove);
            viewToRemove.trigger('test');

            testCallback.should.not.have.been.called;
        });
    });

    describe('.getView()', function() {
        it('should return the view from the destination', function() {
            var testView = new Backbone.View();
            var destination = 'append .destination';
            layoutView.addView(destination, testView);
            layoutView.getView(destination).should.eql(testView);
        });

        it('should return undefined if the view did not exist', function() {
            var destination = 'append .destination';
            should.equal(layoutView.getView(destination), undefined);
        });
    });

    describe('.resetViews()', function() {
        it('should remove all views', function() {
            var testView1 = new Backbone.View();
            var testView2 = new Backbone.View();
            var destination1 = 'append .destination1';
            var destination2 = 'append .destination2';
            var views2 = {};
            views2[destination2] = testView2;

            layoutView.addView(destination1, testView1);
            layoutView.getView(destination1).should.not.be.empty;
            layoutView.resetViews(views2);
            should.equal(layoutView.getView(destination1), undefined);
        });

        it('should re-add the views supplied to the correct destination', function() {
            var testView1 = new Backbone.View();
            var testView2 = new Backbone.View();
            var destination1 = 'append .destination1';
            var destination2 = 'append .destination2';
            var views2 = {};
            views2[destination2] = testView2;

            layoutView.addView(destination1, testView1);
            layoutView.resetViews(views2);
            layoutView.getView(destination2).should.eql(testView2);
        });
    });

    describe('.ready()', function() {
        it('should be fulfiled when super and all views are ready()', function() {
            var testView1 = new BaseView();
            var testView2 = new BaseView();

            var baseViewDeferred = new $.Deferred();
            var testView1Deferred = new $.Deferred();
            var testView2Deferred = new $.Deferred();

            layoutView.addView('append .destination1', testView1);
            layoutView.addView('append .destination2', testView2);

            var readyStub1 = sinon.stub(BaseView.prototype, "ready").returns(baseViewDeferred),
                readyStub2 = testView1.ready.returns(testView1Deferred),
                readyStub3 = testView2.ready.returns(testView2Deferred);

            layoutView.ready().state().should.eql('pending');

            baseViewDeferred.resolve();
            layoutView.ready().state().should.eql('pending');

            testView1Deferred.resolve();
            layoutView.ready().state().should.eql('pending');

            testView2Deferred.resolve();
            layoutView.ready().state().should.eql('resolved');

            readyStub1.restore();
            readyStub2.restore();
            readyStub3.restore();
        });
    });

    describe('.swapView()', function() {
        var testView1, testView2, destination;
        beforeEach(function() {
            testView1 = new BaseView({ className: 'test1' });
            testView2 = new BaseView({ className: 'test2' });
            destination = 'append .destination';
        });

        it('should replace the old view with the new view', function() {
            layoutView.addView(destination, testView1);
            layoutView.swapView(destination, testView2);

            layoutView.getView(destination).should.eql(testView2);
        });

        it('should render the new view', function() {
            layoutView = new LayoutView({
                template: '<div class="destination"><hr></div>'
            });

            layoutView.addView(destination, testView1);
            layoutView.render();

            layoutView.swapView(destination, testView2);
            layoutView.$el.html().should.eql('<div class="destination"><hr><div class="test2"></div></div>');
        });
    });

    describe('.partial()', function() {
        var selector, index, total, $insert1, $insert2;
        beforeEach(function() {
            layoutView = new LayoutView({
                template: '<div class="destination"><hr></div>'
            });
            layoutView.render();
            selector = ".destination";
            index = 0;
            total = 2;

            $insert1 = (new BaseView({ className: 'test1' })).$el;
            $insert2 = (new BaseView({ className: 'test2' })).$el;

        });

        it('should replace the inner of $el', function() {
            var method = 'inner';
            layoutView.partial(method, selector, index, total, $insert1);
            layoutView.$el.html().should.eql('<div class="destination"><div class="test1"></div></div>');

            layoutView.partial(method, selector, index+1, total, $insert2);
            layoutView.$el.html().should.eql('<div class="destination"><div class="test2"></div></div>');
        });

        it('should add the view to outer', function() {
            var method = 'outer';

            layoutView.partial(method, selector, index, total, $insert1);
            layoutView.$el.html().should.eql('<div class="test1"></div>');

            layoutView.partial(method, selector, index+1, total, $insert2);
            layoutView.$el.html().should.eql('<div class="test1"></div>');

            layoutView.partial(method, '.test1', index+1, total, $insert2);
            layoutView.$el.html().should.eql('<div class="test2"></div>');
        });

        it('should add the view by prepend', function() {
            var method = 'prepend';

            layoutView.partial(method, selector, index, total, $insert1);
            layoutView.$el.html().should.eql('<div class="destination"><div class="test1"></div><hr></div>');

            layoutView.partial(method, selector, index+1, total, $insert2);
            layoutView.$el.html().should.eql('<div class="destination"><div class="test2"></div><div class="test1"></div><hr></div>');
        });

        it('should add the view by append', function() {
            var method = 'append';

            layoutView.partial(method, selector, index, total, $insert1);
            layoutView.$el.html().should.eql('<div class="destination"><hr><div class="test1"></div></div>');

            layoutView.partial(method, selector, index+1, total, $insert2);
            layoutView.$el.html().should.eql('<div class="destination"><hr><div class="test1"></div><div class="test2"></div></div>');
        });

        it('should add the view before', function() {
            var method = 'before';

            layoutView.partial(method, selector, index, total, $insert1);
            layoutView.$el.html().should.eql('<div class="test1"></div><div class="destination"><hr></div>');

            layoutView.partial(method, selector, index+1, total, $insert2);
            layoutView.$el.html().should.eql('<div class="test1"></div><div class="test2"></div><div class="destination"><hr></div>');
        });

        it('should add the view after', function() {
            var method = 'after';

            layoutView.partial(method, selector, index, total, $insert1);
            layoutView.$el.html().should.eql('<div class="destination"><hr></div><div class="test1"></div>');

            layoutView.partial(method, selector, index+1, total, $insert2);
            layoutView.$el.html().should.eql('<div class="destination"><hr></div><div class="test2"></div><div class="test1"></div>');
        });
    });

    describe('.render()', function() {
        var renderElement, renderViews, renderState;
        beforeEach(function() {
            renderElement = sinon.stub(layoutView, 'renderElement').returns(layoutView);
            renderViews = sinon.stub(layoutView, 'renderViews').returns(layoutView);
            renderState = sinon.spy(layoutView, 'renderState');
        });

        it('should render the element', function() {
            layoutView.render();
            layoutView.renderElement.should.be.calledOnce;
        });

        it('should render the child views after the element', function() {
            layoutView.render();

            renderViews.should.be.calledAfter(renderElement);
        });

        it('shoult render state after the child views', function() {
            layoutView.render();

            renderState.should.be.calledAfter(renderViews);
        });
        it('should return this for chaining', function() {
            layoutView.render().should.eql(layoutView);
        });
    });

    describe('.renderViews()', function() {
        it('render each child view', function() {
            layoutView = new LayoutView({
                template: '<div class="destination"><hr></div>'
            });
            var testView1 = new BaseView({ className:'test1'});
            var testView2 = new BaseView({ className:'test2'});
            var destination1 = 'append .destination';
            var destination2 = 'prepend .destination';
            layoutView.addView(destination1, testView1);
            layoutView.addView(destination2, testView2);


            layoutView.renderElement();
            layoutView.$el.html().should.eql('<div class="destination"><hr></div>');

            layoutView.renderViews();
            layoutView.$el.html().should.eql('<div class="destination"><div class="test2"></div><hr><div class="test1"></div></div>');


        });
    });

    describe('.attach()', function() {
        var attachElement, attachViews, attachState;
        beforeEach(function() {
            attachElement = sinon.stub(layoutView, 'attachElement').returns(layoutView);
            attachViews = sinon.stub(layoutView, 'attachViews').returns(layoutView);
            attachState = sinon.spy(layoutView, 'attachState');
        });

        it('should attach the element', function() {
            layoutView.attach();
            layoutView.attachElement.should.be.calledOnce;
        });

        it('should attach the child views after the element', function() {
            layoutView.attach();

            attachViews.should.be.calledAfter(attachElement);
        });

        it('shoult attach state after the child views', function() {
            layoutView.attach();

            attachState.should.be.calledAfter(attachViews);
        });
        it('should return this for chaining', function() {
            layoutView.attach().should.eql(layoutView);
        });
    });

    describe('.attachViews()', function() {
        it('should attach each child view', function() {
            var html = '<div role="main"><div class="destination attached"><div class="test2 attached"></div><hr><div class="test1 attached"></div></div></div>';
            layoutView = new LayoutView({
                template: '<div class="destination"><hr></div>'
            });

            var testView1 = new BaseView({ className:'test1'});
            var testView2 = new BaseView({ className:'test2'});
            var destination1 = 'append .destination';
            var destination2 = 'prepend .destination';
            layoutView.addView(destination1, testView1);
            layoutView.addView(destination2, testView2);

            $('body').append(html);

            layoutView.attachElement('div[role=main]');
            layoutView.attachViews();

            layoutView.$el.find('.destination').hasClass('attached').should.be.true;
            testView1.$el.hasClass('attached').should.be.true;
            testView2.$el.hasClass('attached').should.be.true;

            $('div[role=main]').remove();
        });
    });

});
