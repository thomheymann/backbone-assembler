(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['backbone', 'underscore'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('backbone'), require('underscore'));
    } else {
        root.Assembler = factory(root.Backbone, root._);
    }
}(this, function(Backbone, _) {
    var Assembler = {};

    Assembler.View = Backbone.View.extend({
        template: null,
        modelEvents: null,
        collectionEvents: null,

        lazy: null,

        constructor: function(options) {
            this.options = options || (options = {});

            Backbone.View.prototype.constructor.call(this, options);
        },
        initialize: function(options) {
            _.extend(this, _.pick(options, 'template', 'modelEvents', 'collectionEvents', 'lazy'));

            if (this.template) {
                this.setTemplate(this.template);
            }
            if (this.model) {
                this.delegateModelEvents();
            }
            if (this.collection) {
                this.delegateCollectionEvents();
            }
        },

        _listenToEvents: function(other, events) {
            _.each(events, function(callback, event) {
                if (!_.isFunction(callback)) {
                    callback = this[callback];
                }
                if (!callback) {
                    throw new Error('Method "' + callback + '" does not exist');
                }
                this.listenTo(other, event, callback);
            }, this);
        },
        delegateModelEvents: function() {
            this.listenTo(this.model, 'change', this.voidRendered);
            this._listenToEvents(this.model, _.result(this, 'modelEvents'));
        },
        undelegateModelEvents: function() {
            this.stopListening(this.model);
        },
        delegateCollectionEvents: function() {
            this._listenToEvents(this.collection, _.result(this, 'collectionEvents'));
        },
        undelegateCollectionEvents: function() {
            this.stopListening(this.collection);
        },

        setModel: function(model) {
            if (this.model) {
                this.undelegateModelEvents();
            }
            this.model = model;
            if (model) {
                this.delegateModelEvents();
            }
            this.voidRendered();
            return this;
        },
        setCollection: function(collection) {
            if (this.collection) {
                this.undelegateCollectionEvents();
            }
            this.collection = collection;
            if (collection) {
                this.delegateCollectionEvents();
            }
            this.voidRendered();
            return this;
        },
        setTemplate: function(template) {
            if (!_.isFunction(template)) {
                template = _.template(template);
            }
            this.template = template;
            this.voidRendered();
            return this;
        },

        ready: function(options) {
            var promises = [];
            if (this.model) {
                promises.push(this.model.fetch(options));
            }
            if (this.collection) {
                promises.push(this.collection.fetch(options));
            }
            return this.promiseCoupler(Backbone.$.when.apply(Backbone.$.when, promises), options);
        },
        promiseCoupler: function(promise, options) {
            return promise;
        },
        swapModel: function(model, options) {
            var view = this;
            return model.fetch(options).done(function() {
                view.setModel(model);
                view.render();
            });
        },
        swapCollection: function(collection, options) {
            var view = this;
            return collection.fetch(options).done(function() {
                view.setCollection(collection);
                view.render();
            });
        },

        toJSON: function() {
            var data = (this.model) ? this.model.toJSON() : {};
            return this.dataDecorator(data);
        },
        dataDecorator: function(data) {
            return data;
        },
        toHTML: function() {
            return this.template ? this.template(this.toJSON()) : '';
        },

        render: function(options) {
            return this.renderElement(options).renderState(options);
        },
        renderElement: function(options) {
            options || (options = {});
            if (options.force || !_.result(this, 'lazy') || !this._rendered) {
                // Can't use `.html()` here as there is a bug in IE7-11 which occurs when innerHTML'ing a DOM element
                // while trying to keep a reference to one of its child nodes. The reference is kept but IE trashes the
                // node's contents so you're left with an empty tag. This only happens when using innerHTML - direct
                // DOM manipulation is working as expected.
                this.$el.empty().append(this.toHTML());
                this._rendered = true;
            }
            return this;
        },
        renderState: function(options) {
            return this;
        },

        attach: function(element) {
            return this.attachElement(element).attachState();
        },
        attachElement: function(element) {
            element || (element = this.$el);
            this._rendered = !!element.length;
            return this.setElement(element);
        },
        attachState: function() {
            return this;
        },

        voidRendered: function() {
            this._rendered = false;
        },

        remove: function() {
            if (this.parentView) {
                this.parentView.removeView(this);
            }
            return Backbone.View.prototype.remove.call(this);
        },

        innerHTML: function() {
            return this.$el.html();
        },
        outerHTML: function() {
            // Attributes to clone
            var attrs = _.keys(_.result(this, 'attributes'));
            if (this.id) {
                attrs.push('id');
            }
            if (this.className) {
                attrs.push('class');
            }

            // Generate markup
            var closeTag = _.result(this, 'tagName');
            var openTag = _.reduce(attrs, function(html, attr) {
                var val;
                if (val = this.$el.attr(attr)) {
                    return html + ' ' + attr + '="' + val + '"';
                }
                return html;
            }, closeTag, this);

            return '<'+ openTag + '>' + this.$el.html() + '</' + closeTag + '>';
        },

        clone: function() {
            return new this.constructor(this.options);
        }
    });

    Assembler.LayoutView = Assembler.View.extend({
        viewEvents: null,

        constructor: function(options) {
            this.options = options || (options = {});

            this.views = [];
            this._byDestination = {};

            Assembler.View.prototype.constructor.call(this, options);
        },
        initialize: function(options) {
            Assembler.View.prototype.initialize.call(this, options);

            _.extend(this, _.pick(options, 'viewEvents'));

            if (options.views) {
                this.resetViews(options.views);
            }
        },

        delegateViewEvents: function(view) {
            this._listenToEvents(view, _.result(this, 'viewEvents'));
        },
        undelegateViewEvents: function(view) {
            this.stopListening(view);
        },

        getView: function(destination, index) {
            index || (index = 0);

            var match = destination.match(destinationSplitter),
                method = match[1],
                selector = match[2];

            if (typeof this._byDestination[selector] === 'object' && typeof this._byDestination[selector][method] === 'object') {
                return this._byDestination[selector][method][index];
            }
        },
        addView: function(destination, index, viewToAdd) {
            if (typeof index === 'object') {
                viewToAdd = index;
                index = null;
            }

            var match = destination.match(destinationSplitter),
                method = match[1],
                selector = match[2];

            this._prepareForAdd(viewToAdd);

            this._byDestination[selector] || (this._byDestination[selector] = {});
            this._byDestination[selector][method] || (this._byDestination[selector][method] = []);
            if (typeof index === 'number') {
                this._byDestination[selector][method].splice(index, 0, viewToAdd);
            } else {
                this._byDestination[selector][method].push(viewToAdd);
            }
            this.views.push(viewToAdd);

            return viewToAdd;
        },
        removeView: function(destination, index) {
            var viewToRemove = (typeof destination === 'string') ? this.getView(destination, index) : destination;
            if (viewToRemove) {
                var done;
                _.each(this._byDestination, function(byMethod, selector) {
                    _.each(byMethod, function(views, method) {
                        _.each(views, function(view, index) {
                            if (view === viewToRemove) {
                                this._prepareForRemove(viewToRemove);

                                this._byDestination[selector][method].splice(index, 1);
                                this.views = _.without(this.views, viewToRemove);
                                return false;
                            }
                        }, this);
                    }, this);
                }, this);
            }
        },
        resetViews: function(viewsToAdd) {
            _.each(this.views, this.removeView, this);
            _.each(viewsToAdd, function(view, destination) {
                this.addView(destination, view);
            }, this);
        },
        findViews: function(destination) {
            var match = destination.match(destinationSplitter),
                method = match[1],
                selector = match[2];

            if (typeof this._byDestination[selector] === 'object' && typeof this._byDestination[selector][method] === 'object') {
                return this._byDestination[selector][method].slice(0);
            }
            return [];
        },
        indexOf: function(view) {
            var result = -1;
            _.each(this._byDestination, function(byMethod, selector) {
                _.each(byMethod, function(views, method) {
                    return (result = _.indexOf(views, view)) !== -1;
                });
                return result !== -1;
            });
            return result;
        },
        
        _prepareForAdd: function(view) {
            view.parentView = this;
            this.delegateViewEvents(view);
        },
        _prepareForRemove: function(view) {
            if (view.parentView === this) {
                delete view.parentView;
            }
            this.undelegateViewEvents(view);
            view.remove();
        },

        ready: function(options) {
            var basePromise = Assembler.View.prototype.ready.call(this, options);
            var layoutPromises = [];
            _.each(this.views, function(view) {
                layoutPromises.push(view.ready());
            }, this);
            return basePromise.then(function() {
                return $.when.apply($.when, layoutPromises);
            });
        },
        swapView: function(destination, index, viewToAdd, options) {
            if (typeof index === 'object') {
                options = viewToAdd;
                viewToAdd = index;
                index = null;
            }
            var that = this;
            return viewToAdd.ready(options).done(function() {
                that.removeView(destination, index);
                that.addView(destination, viewToAdd);
                that.renderViews();
            });
        },

        _partial: function(method, selector, index, total, $insert) {
            $el = (selector) ? this.$el.find(selector) : this.$el;
            return partialMethods[method].call(this, $el, index, total, $insert);
        },

        render: function(options) {
            return this.renderElement(options).renderViews(options).renderState(options);
        },
        renderViews: function(options) {
            _.each(this._byDestination, function(byMethod, selector) {
                _.each(byMethod, function(views, method) {
                    var total = views.length;
                    _.each(views, function(view, index) {
                        this._partial(method, selector, index, total, view.render(options).$el);
                        view.delegateEvents();
                    }, this);
                }, this);
            }, this);
            return this;
        },

        attach: function(element) {
            return this.attachElement(element).attachViews().attachState();
        },
        attachViews: function() {
            _.each(this._byDestination, function(byMethod, selector) {
                _.each(byMethod, function(views, method) {
                    var total = views.length;
                    _.each(views, function(view, index) {
                        var $el = this._partial(method, selector, index, total);
                        if ($el[0]) {
                            view.attach($el);
                        }
                    }, this);
                }, this);
            }, this);
            return this;
        }
    });

    var destinationSplitter = /^(inner|outer|prepend|append|before|after)\s*(.*)\s*$/i;
    var partialMethods = {
        inner: function($el, index, total, $insert) {
            if ($insert) {
                return $el.empty().append($insert);
            }
            return $el.children().first();
        },
        outer: function($el, index, total, $insert) {
            // replaceWith would remove the DOM element if $insert and $el are identical
            if ($insert && $insert[0] !== $el[0]) {
                return $el.replaceWith($insert);
            }
            return $el;
        },
        prepend: function($el, index, total, $insert) {
            if ($insert) {
                return $el.prepend($insert);
            }
            return $el.children().eq(total-1-index);
        },
        append: function($el, index, total, $insert) {
            if ($insert) {
                return $el.append($insert);
            }
            return $el.children().eq(index-total);
        },
        before: function($el, index, total, $insert) {
            if ($insert) {
                return $el.before($insert);
            }
            return $el.prevAll().eq(total-1-index);
        },
        after: function($el, index, total, $insert) {
            if ($insert) {
                return $el.after($insert);
            }
            return $el.nextAll().eq(total-1-index);
        }
    };

    Assembler.ListView = Assembler.LayoutView.extend({
        itemDestination: 'append',
        itemView: Assembler.View,

        initialize: function(options) {
            _.extend(this, _.pick(options, 'itemDestination', 'itemView'));

            if (!this.itemView) {
                throw new Error('ListView.initialize expects this.itemView or options.itemView');
            } else if (!_.isFunction(this.itemView)) {
                throw new Error('ListView.initialize expects this.itemView to be a constructor');
            }

            Assembler.LayoutView.prototype.initialize.call(this, options);

            if (this.collection) {
                this.resetItemViews(this.collection);
            }
        },

        delegateCollectionEvents: function() {
            this.listenTo(this.collection, 'add', this.addItemView);
            this.listenTo(this.collection, 'remove', this.removeItemView);
            this.listenTo(this.collection, 'reset', this.resetItemViews);
            this.listenTo(this.collection, 'sort', this.sortItemViews);
            Assembler.LayoutView.prototype.delegateCollectionEvents.call(this);
        },
        setCollection: function(collection) {
            this.resetItemViews(collection);
            return Assembler.LayoutView.prototype.setCollection.call(this, collection);
        },

        createItemView: function(model) {
            return new this.itemView({
                app: this.app,
                model: model
            });
        },
        addItemView: function(model, collection, options) {
            return this.addView(this.itemDestination, typeof options === 'object' ? options.at : undefined, this.createItemView(model));
        },
        removeItemView: function(model) {
            return this.removeView(this.getItemView(model));
        },
        getItemView: function(index) {
            if (index instanceof Backbone.Model) {
                return _.find(this.views, function(view) {
                    return view.model === index;
                });
            }
            return this.getView(this.itemDestination, index);
        },
        resetItemViews: function(collection) {
            // Items have been reset completely
            _.each(this.findViews(this.itemDestination), this.removeView, this);
            collection.each(this.addItemView, this);
        },
        sortItemViews: function(collection) {
            // Same list of items but indexes have changed
            // TODO: make this less destructive
            this.resetItemViews(collection);
        }
    });

    return Assembler;
}));
