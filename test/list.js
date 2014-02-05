describe('Assembler.ListView', function() {
    BaseView = Assembler.View;
    _.extend(BaseView.prototype, Assembler.HandlebarsMixin);

    ListView = Assembler.ListView;

    var childView, listView;

    beforeEach(function(){
        childView = BaseView;
        listView = new ListView({
            itemView: childView
        });
    });

    describe('.initialize()', function() {
        it('requires an itemView', function() {
            (function() {
                new ListView({
                    itemView: null
                });
            }).should.throw;
        });

        it('requires itemView to be a constructor', function() {
            (function() {
                new ListView({
                    itemView: "I am a view"
                });
            }).should.throw;

            (function() {
                new ListView({
                    itemView: childView
                });
            }).should.not.throw;
        });

        it('should set itemView from the options', function() {
            var itemView = childView;
            listView = new ListView({
                itemView: itemView
            });

            listView.itemView.should.eql(itemView);
        });

        it('should set itemDestination from the options', function() {
            var itemDestination = 'append .somePlace';

            listView = new ListView({
                itemView: childView,
                itemDestination: itemDestination
            });

            listView.itemDestination.should.eql(itemDestination);
        });

        it('should call super.initialize()', function() {
            var initializeStub = sinon.stub(Assembler.LayoutView.prototype, "initialize");

            listView = new ListView({
                itemView: childView
            });

            initializeStub.should.have.been.called.once;
            initializeStub.restore();
        });

        it('should reset the item views if a collection is set', function() {
            var testModel = new Backbone.Model({ name: 'test'});
            var testCollection = new Backbone.Collection([testModel]);

            listView = new ListView({
                collection: testCollection,
                itemView: childView
            });

            listView.views.length.should.eql(1);
            listView.views[0].model.should.eql(testModel);
        });
    });

    describe('.delegateCollectionEvents()', function() {
        it('should add the ItemView on the collection add event', function() {
            var testModel = new Backbone.Model({});
            listView.setCollection(new Backbone.Collection());

            listView.views.length.should.eql(0);
            listView.collection.add(testModel);
            listView.views.length.should.eql(1);

            listView.views[0].model.should.eql(testModel);
        });

        it('should remove the ItemView on the collection remove event', function() {
            var testModel = new Backbone.Model({});
            listView.setCollection(new Backbone.Collection([testModel]));

            listView.views.length.should.eql(1);
            listView.collection.remove(testModel);
            listView.views.length.should.eql(0);
        });

        it('should reset the ItemView on the collection reset event', function() {
            var testModel1 = new Backbone.Model({ name: 'test1'});
            var testModel2 = new Backbone.Model({ name: 'test2'});

            var testCollection = new Backbone.Collection([testModel1]);
            listView.setCollection(testCollection);
            listView.views.length.should.eql(1);

            testCollection.reset([testModel2]);
            listView.views.length.should.eql(1);
            listView.views[0].model.should.eql(testModel2);
        });

        it('should sort the ItemViews on the collection sort event', function() {
            var testModel1 = new Backbone.Model({ name: 'test1'});
            var testModel2 = new Backbone.Model({ name: 'test2'});

            var testCollection = new Backbone.Collection([testModel2]);
            testCollection.comparator = 'name';

            listView.setCollection(testCollection);
            listView.collection.add(testModel1);

            listView.collection.at(0).should.eql(testModel1);
            listView.views[0].model.should.eql(testModel1);

        });

        it('should call super.delegateCollectionEvents()', function() {
            var delegateCollectionEventsStub = sinon.stub(Assembler.LayoutView.prototype, "delegateCollectionEvents");

            listView = new ListView({
                itemView: childView
            });
            listView.setCollection(new Backbone.Collection());
            listView.delegateCollectionEvents();

            delegateCollectionEventsStub.should.have.been.called.once;
            delegateCollectionEventsStub.restore();
        });
     });

    describe('.setCollection()', function() {
        it('should reset the item views', function() {
            var testModel = new Backbone.Model({ name: 'test' });
            listView.addItemView(testModel);
            listView.getItemView(testModel).should.not.be.empty;
            listView.setCollection(new Backbone.Collection());
            should.equal(listView.getItemView(testModel), undefined);
        });

        it('should call super.setCollection()', function() {
            var setCollectionStub = sinon.stub(Assembler.LayoutView.prototype, "delegateCollectionEvents");

            listView = new ListView({
                itemView: childView
            });
            listView.setCollection(new Backbone.Collection());

            setCollectionStub.should.have.been.called.once;
            setCollectionStub.restore();
        });
    });

    describe('.createItemView()', function(){
        it('should return an itemView whose model is the model supplied', function(){
            var testModel = new Backbone.Model({});
            var itemView = listView.createItemView(testModel);

            should.exist(itemView);
            itemView.should.have.ownProperty('model')
                    .and.be.an.instanceOf(listView.itemView);
            itemView.model.should.eql(testModel);
        });
    });

    describe('.addItemView()', function(){
        it('should add a new ItemView created from the supplied model to the layout', function(){
            var testModel = new Backbone.Model({});
            listView.addItemView(testModel);

            should.exist(listView.views[0]);
            listView.views[0].model.should.eql(testModel);
        })
    });

    describe('.getItemView()', function(){
        it('should return the item view associated with the supplied model', function(){
            var testModel = new Backbone.Model({});
            listView.addItemView(testModel);

            var itemView = listView.getItemView(testModel);

            itemView.should.be.an.instanceOf(listView.itemView);
            itemView.model.should.eql(testModel);
        })
    });

    describe('.removeItemView()', function(){
        it('should remove the item view associated with the supplied model from the layout view', function(){
            var testModel = new Backbone.Model({});
            listView.addItemView(testModel);
            listView.removeItemView(testModel);
            var itemView = listView.getItemView(testModel);

            should.not.exist(itemView);
        })
    });

    describe('.resetItemViews()', function() {
        it('should remove all items from the itemDestination', function() {
            var testModel = new Backbone.Model({ name: 'test' });
            listView.addItemView(testModel);
            listView.getItemView(testModel).should.not.be.empty;
            listView.resetItemViews(new Backbone.Collection());
            should.equal(listView.getItemView(testModel), undefined);
        });
        it('should then add each model in the collection again', function() {
            var testModel = new Backbone.Model({ name: 'test' });
            listView.addItemView(testModel);
            listView.getItemView(testModel).should.not.be.empty;
            listView.resetItemViews(new Backbone.Collection(testModel));
            listView.getItemView(testModel).should.not.be.empty;
        });
    });

    describe('.sortItemViews()', function() {
        it('should reset the item views', function() {
            var testModel = new Backbone.Model({ name: 'test' });
            listView.addItemView(testModel);
            listView.getItemView(testModel).should.not.be.empty;
            listView.sortItemViews(new Backbone.Collection());
            should.equal(listView.getItemView(testModel), undefined);
        });
    });

});
