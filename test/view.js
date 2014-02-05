describe('Assembler.View', function() {
    BaseView = Assembler.View;
    _.extend(BaseView.prototype, Assembler.HandlebarsMixin);

    var baseView;
    beforeEach(function(){
        baseView = new BaseView();
    });

    describe('.modelEvents', function() {
        var model, voidRendered, test1Callback, test2Callback;
        beforeEach(function() {
            baseView.model = model = new Backbone.Model({ name: 'model' });

            test1Callback = sinon.spy();
            test2Callback = sinon.spy();
            voidRendered = sinon.spy(baseView, 'voidRendered');

            baseView.modelEvents = {
                'test1': test1Callback,
                'test2': test2Callback
            };
        });

        describe('.delegateModelEvents()', function() {
            it('should call voidRendered on change', function() {
                baseView.delegateModelEvents();

                model.trigger('change');
                voidRendered.should.have.been.calledOnce;
            });

            it('should call callbacks of additional model events', function() {
                baseView.delegateModelEvents();

                model.trigger('test1');
                test1Callback.should.have.been.calledOnce;

                model.trigger('test2');
                test2Callback.should.have.been.calledOnce;
            });
        });

        describe('.undelegateModelEvents()', function() {
            it('should not call voidRendered on change', function() {
                baseView.undelegateModelEvents();

                baseView.model.trigger('change');
                voidRendered.should.not.have.been.called;
            });

            it('should stop listing to additional model events', function() {
                baseView.undelegateModelEvents();

                model.trigger('test1');
                test1Callback.should.not.have.been.called;

                model.trigger('test2');
                test2Callback.should.not.have.been.called;
            });
        });
    });

    describe('.collectionEvents', function() {
        var collection, voidRendered, test1Callback, test2Callback;
        beforeEach(function() {
            baseView.collection = collection = new Backbone.Collection();

            test1Callback = sinon.spy();
            test2Callback = sinon.spy();
            voidRendered = sinon.spy(baseView, 'voidRendered');

            baseView.collectionEvents = {
                'test1': test1Callback,
                'test2': test2Callback
            };
        });

        describe('.delegateCollectionEvents()', function() {
            it('should call callbacks of additional collection events', function() {
                baseView.delegateCollectionEvents();

                collection.trigger('test1');
                test1Callback.should.have.been.calledOnce;

                collection.trigger('test2');
                test2Callback.should.have.been.calledOnce;
            });
        });

        describe('.undelegateCollectionEvents()', function() {
            it('should stop listing to additional collection events', function() {
                baseView.undelegateCollectionEvents();

                collection.trigger('test1');
                test1Callback.should.not.have.been.called;

                collection.trigger('test2');
                test2Callback.should.not.have.been.called;
            });
        });
    });

    describe('.setModel()', function() {
        var model;

        beforeEach(function() {
           model = new Backbone.Model({ name: 'model' });
        });

        it('should update the model', function() {
           should.not.exist(baseView.model);
           baseView.setModel(model);
           baseView.model.should.equal(model);
        });

        it('should undelegate old model events', function() {
            var oldModel = new Backbone.Model({ name: 'oldModel' });
            var testCallback = sinon.spy();
            baseView.modelEvents = {
                'test': testCallback
            };

            baseView.setModel(oldModel);
            baseView.setModel(model);

            oldModel.trigger('test');
            testCallback.should.not.have.been.called;
        });

        it('should not fail undelegation if there is no old model', function() {
            should.not.exist(baseView.model);
            (function() { baseView.setModel(model); }).should.not.throw();
        });

        it('should delegate new model events', function() {
            var testModelChanged;
            var testCallback = sinon.spy();
            baseView.modelEvents = {
                'test': testCallback
            };

            baseView.setModel(model);

            model.trigger('test');
            testCallback.should.have.been.calledOnce;
        });

        it('should call voidRendered to mark ready for rendering', function() {
            baseView.voidRendered = sinon.spy();

            baseView.setModel(model);
            baseView.voidRendered.should.have.been.calledOnce;
        });

        it('should return this for chaining', function() {
            baseView.setModel(model).should.eql(baseView);
        });
    });

    describe('.setCollection()', function() {
        var collection;

        beforeEach(function() {
           collection = new Backbone.Collection();
        });

        it('should update the collection', function() {
           should.not.exist(baseView.collection);
           baseView.setCollection(collection);
           baseView.collection.should.equal(collection);
        });

        it('should undelegate old collection events', function() {
            var oldCollection = new Backbone.Collection();
            var testCallback = sinon.spy();
            baseView.collectionEvents = {
                'test': testCallback
            };

            baseView.setCollection(oldCollection);
            baseView.setCollection(collection);

            oldCollection.trigger('test');
            testCallback.should.not.have.been.called;
        });

        it('should not fail undelegation if there is no old collection', function() {
            should.not.exist(baseView.collection);
            (function() { baseView.setCollection(collection); }).should.not.throw();
        });

        it('should delegate new collection events', function() {
            var testCallback = sinon.spy();
            baseView.collectionEvents = {
                'test': testCallback
            };

            baseView.setCollection(collection);

            collection.trigger('test');
            testCallback.should.have.been.calledOnce;
        });

        it('should call voidRendered to mark ready for rendering', function() {
            baseView.voidRendered = sinon.spy();

            baseView.setCollection(collection);
            baseView.voidRendered.should.have.been.calledOnce;
        });

        it('should return this for chaining', function() {
            baseView.setCollection(collection).should.eql(baseView);
        });
    });

    describe('.setTemplate()', function() {
        var template, testData, rendered;

        beforeEach(function() {
            template = '<div>{{ name }}</div>';
            testName = 'testName';
            testData = { 'name': testName };
            rendered = '<div>'+testName+'</div>';
        });

        it('should update the template when it is a function', function() {
            var funcTemplate = Handlebars.compile(template);
            baseView.setTemplate(funcTemplate);
            baseView.template(testData).should.eql(rendered);
        });

        it('should update the template when a string', function() {
            baseView.setTemplate(template);
            baseView.template(testData).should.eql(rendered);
        });

        it('should return this for chaining', function() {
            baseView.setTemplate(template).should.eql(baseView);
        });
    });

    describe('.ready()', function() {
        it('should be fulfilled when the model has been fetched', function() {
            var testModel = new Backbone.Model({ name: 'test' });
            var testModelDeferred = new $.Deferred();
            testModel.fetch = sinon.stub().returns(testModelDeferred);

            baseView.setModel(testModel);

            baseView.ready().state().should.eql('pending');

            testModelDeferred.resolve();

            baseView.ready().state().should.eql('resolved');
        });

        it('should be fulfilled when the collection has been fetched', function() {
            var testCollection = new Backbone.Collection();
            var testCollectionDeferred = new $.Deferred();
            testCollection.fetch = sinon.stub().returns(testCollectionDeferred);

            baseView.setCollection(testCollection);

            baseView.ready().state().should.eql('pending');

            testCollectionDeferred.resolve();

            baseView.ready().state().should.eql('resolved');
        });

        it('should be passed through the promiseCoupler', function() {
            var testModel = new Backbone.Model({ name: 'test' });
            var testModelDeferred = new $.Deferred();
            testModel.fetch = sinon.stub().returns(testModelDeferred);
            baseView.setModel(testModel);

            baseView.ready().state().should.eql('pending');

            baseView.promiseCoupler = function(promise, options) {
                return testModelDeferred.reject();
            }

            baseView.ready().state().should.eql('rejected');
        });
    });

    describe('.promiseCoupler()', function() {
        it('should return the promise', function() {
            var promise = new $.Deferred();
            baseView.promiseCoupler(promise, {}).should.eql(promise);
        });
    });

    describe('.swapModel()', function() {
        var model;
        var mockModel;
        beforeEach(function() {
            model = new Backbone.Model({ name: 'model' });
            newModel = new Backbone.Model({ name: 'newModel'});

            var xhr = new $.Deferred();
            sinon.stub(xhr, 'done').callsArg(0);
            sinon.stub(newModel, 'fetch').returns(xhr);

            baseView.setTemplate('{{name}}');
            baseView.setModel(model);
        });

        it('should fetch the model, then set the view model', function() {
            baseView.swapModel(newModel);

            baseView.model.should.eql(newModel);
        });
        it('should fetch the model, then render the view', function() {
            baseView.swapModel(newModel);

            baseView.model.should.eql(newModel);
        });
    });

    describe('.swapCollection()', function() {
        var collection;
        var mockCollection;
        beforeEach(function() {
            collection = new Backbone.Collection({ name: 'collection' });
            newCollection = new Backbone.Collection({ name: 'newCollection'});

            var xhr = new $.Deferred();
            sinon.stub(xhr, 'done').callsArg(0);
            sinon.stub(newCollection, 'fetch').returns(xhr);

            baseView.setTemplate('{{name}}');
            baseView.setCollection(collection);
        });

        it('should fetch the collection, then set the view collection', function() {
            baseView.swapCollection(newCollection);

            baseView.collection.should.eql(newCollection);
        });
        it('should fetch the collection, then render the view', function() {
            baseView.swapCollection(newCollection);

            baseView.collection.should.eql(newCollection);
        });
    });

    describe('.toJSON()', function(){
        it('should return a JSON representation of the view\'s model', function(){
            var testString = 'TEST';
            var data = {name:testString, type:testString};
            var model = new Backbone.Model(data);
            baseView.setModel(model);

            var jsonRepresentation = baseView.toJSON();
            jsonRepresentation.should.hasOwnProperty('name');
            jsonRepresentation.should.hasOwnProperty('type');

            jsonRepresentation.name.should.eql(testString);
            jsonRepresentation.type.should.eql(testString);
        });
        it('should return an empty object if there is no model set', function() {
            should.not.exist(baseView.model);
            baseView.dataDecorator = function (d) { return d; };
            baseView.toJSON().should.be.empty;
        });
        it('should be decorated by the data decorator', function() {
            var data = { name: 'decorate' };
            var model = new Backbone.Model(data);
            baseView.setModel(model);

            var jsonified = baseView.toJSON();
            jsonified.name.should.eql('decorate');
            jsonified.should.eql(baseView.dataDecorator(data));
        });
    });

    describe('.dataDecorator()', function() {
        it('should return the data unchanged', function() {
            var data = { name: 'test' };
            baseView.dataDecorator(data).should.equal(data);
        });
    });

    describe('.toHTML()', function(){
        it('should return a string representing the template with placeholders replaced by their real values', function(){
            var templateText = 'Hello {{name}}',
                name = 'TEST',
                templateHTML;

            baseView.setModel(new Backbone.Model({
                name: name
            }));

            baseView.setTemplate(templateText);
            templateHTML = baseView.toHTML();

            templateHTML.should.eql(templateText.replace('{{name}}', name));
        });

        it('should return nothing if the template is not set', function() {
            baseView.toHTML().should.be.empty;
        });
    });

    describe('.render()', function() {
        it('should render the element', function() {
            var lastRendered;
            sinon.stub(baseView, 'renderElement').returns(baseView);

            baseView.render();

            baseView.renderElement.should.be.calledOnce;

        });

        it('should render the state after the element', function() {
            var lastRendered;
            var renderElement = sinon.stub(baseView, 'renderElement').returns(baseView);
            var renderState = sinon.spy(baseView, 'renderState');

            baseView.render();

            renderState.should.be.calledAfter(renderElement);
        });

        it('should return this for chaining', function() {
            baseView.render().should.eql(baseView);
        });
    });

    describe('.renderElement()', function() {
        var renderedTemplate;
        beforeEach(function() {
            baseView.setTemplate('<div>{{ name }}</div>');
            baseView.setModel(new Backbone.Model({ name: 'rendering' }));
            renderedTemplate = '<div>rendering</div>';
        });

        it('should render if force is true', function() {
            baseView.renderElement({ force: true });
            baseView.$el.html().should.equal(renderedTemplate);
        });

        it('should render if view.lazy is false', function() {
            baseView.lazy = false;

            baseView.renderElement();
            baseView.$el.html().should.equal(renderedTemplate);
        });

        it('should render if view.lazy is a function returning false', function() {
            baseView.lazy = function() { return false; };

            baseView.renderElement();
            baseView.$el.html().should.equal(renderedTemplate);
        });

        it('should render if not currently rendered and lazy is true', function() {
            baseView.voidRendered();

            baseView.renderElement();
            baseView.$el.html().should.equal(renderedTemplate);
        });

        it('should return this for chaining', function() {
            baseView.renderElement().should.eql(baseView);
        });
    });

    describe('.renderState()', function() {
        it('should return this for chaining', function() {
            baseView.renderState().should.eql(baseView);
        });
    });

    describe('.attach()', function() {
        it('should attach the element', function() {
            var lastAttached;
            sinon.stub(baseView, 'attachElement').returns(baseView);

            baseView.attach();

            baseView.attachElement.should.be.calledOnce;

        });

        it('should attach the state after the element', function() {
            var lastAttached;
            var attachElement = sinon.stub(baseView, 'attachElement').returns(baseView);
            var attachState = sinon.spy(baseView, 'attachState');

            baseView.attach();

            attachState.should.be.calledAfter(attachElement);
        });

        it('should return this for chaining', function() {
            baseView.attach().should.eql(baseView);
        });
    });

    describe('.attachElement()', function() {
        it('should attach the supplied element', function() {
             var element1 = $("<span>attaching</span>");
             var element2 = $("<div>somemore</div>");

             baseView.attachElement(element1);
             baseView.$el.should.equal(element1);

             baseView.attachElement(element2);
             baseView.$el.should.equal(element2);
        });

        it('should reattach $el if no element is supplied', function() {
             var element = $("<span>attaching</span>");

             baseView.attachElement(element);
             baseView.attachElement();
             baseView.$el.should.equal(element);
        });

    });

    describe('.attachState()', function() {
        it('should return this for chaining', function() {
            baseView.attachState().should.eql(baseView);
        });
    });

    describe('.remove()', function() {
        it('should remove itself from the parent view if the parent view is set', function() {
            var testRemoved = false;
            var removeView = sinon.spy();
            baseView.parentView = { removeView: removeView };

            baseView.remove();

            removeView.should.be.calledWith(baseView);
        });

        it('should remove itself from the DOM', function() {
            var html =  $('<div class="parent attached"><div class="child attached">attaching</div></div>');
            $('body').append(html);

            baseView = new BaseView({ className: 'child' });
            baseView.parentView = new Assembler.LayoutView({ className: 'parent' });

            baseView.parentView.attach('.parent');
            baseView.attach('.child');

            baseView.$el.parent().children().should.not.be.empty;

            baseView.remove();

            baseView.$el.parent().length.should.eql(0);
        });
    });

    describe('.innerHTML()', function() {
        it('should be the html of the view\'s element', function() {
            var element = $("<div>somemore</div>");
            baseView.attachElement(element);
            baseView.innerHTML().should.eql(element.html());
        });
    });

    describe('.outerHTML()', function() {
        var testID = 'testID';
        var testClassName = 'testClassName';
        var testAttr1 = 'testAttr1';
        var testAttr2 = 'testAttr2';
        var tagName = 'span';

        beforeEach(function(){
            baseView = new BaseView({
                id: testID,
                className: testClassName,
                tagName: 'span',
                attributes: {
                    testattr1: testAttr1,
                    testattr2: testAttr2
                }
            });
        });

        it('should include the id in the outer HTML', function() {
            $(baseView.outerHTML()).attr('id').should.equal(testID);
        });

        it('should include the class in the outer HTML', function() {
            $(baseView.outerHTML()).attr('class').should.equal(testClassName);
        });

        it('should include the arributes in the outerHTML', function() {
            $(baseView.outerHTML()).attr('testattr1').should.equal(testAttr1);
            $(baseView.outerHTML()).attr('testattr2').should.equal(testAttr2);
        });

        it('should open a tag of .tagName', function() {
            baseView.outerHTML().should.match(new RegExp("^<"+tagName+".*>"));
        });

        it('should close a tag of .tagName', function() {
            baseView.outerHTML().should.match(new RegExp("</"+tagName+">$"));
        });

        it('should contain the html of the view $el', function() {
            var element = $("<div>somemore</div>");
            baseView.attachElement(element);
            $(baseView.outerHTML()).html().should.equal(element.html());
        });
    });

    describe('.clone()', function() {
        it('should return a clone of the view', function() {
            clone = baseView.clone();
            clone.should.be.instanceOf(BaseView);
        });

        it('should not be the view itself', function() {
            baseView.clone().should.not.be.eql(baseView);
        });
    });

    describe('rendered state:', function() {
        describe('when lazy is true:', function () {
            beforeEach(function() {
                baseView.lazy = true;
            });

            describe('no element attached', function() {
                it('should not render any element', function() {
                    baseView.attachElement();
                    baseView.renderElement();
                    baseView.innerHTML().should.equal("");
                });
            });

            describe('have voidRendered()', function() {
                it('should render the element', function() {
                    baseView.voidRendered();
                    var element = $("<span>attaching</span>");

                    baseView.attachElement(element);
                    baseView.render();

                    baseView.innerHTML().should.equal(element.html());
                });
            });

            describe('have previously rendered the element', function() {
                it('should not render the element', function() {
                    baseView.renderElement({ force: true });
                    baseView.setTemplate('<span>{{ name }}</span>');
                    baseView.lazy = true;

                    baseView.renderElement();

                    baseView.innerHTML().should.not.equal('<span>rendering</span>');
                });
            });
        });
    });

});
