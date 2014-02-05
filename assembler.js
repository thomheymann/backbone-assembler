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
        swapModel: function(model) {
            var view = this;
            return model.fetch().done(function() {
                view.setModel(model);
                view.render();
            });
        },
        swapCollection: function(collection) {
            var view = this;
            return collection.fetch().done(function() {
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
                this.$el.html(this.toHTML());
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

    Assembler.LayoutView = (function() {
        var LayoutView = Assembler.View.extend({
            viewEvents: null,

            constructor: function(options) {
                this.options = options || (options = {});

                this.views = [];
                this._views = [];
                this._totals = new Counter();

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

            addView: function(destination, view) {
                var match = destination.match(destinationSplitter),
                    method = match[1],
                    selector = match[2];

                var child = {
                    destination: destination,
                    view: view,
                    method: method,
                    selector: selector,
                    index: this._totals.increase(method, selector)
                };

                this._add(child);

                return view;
            },
            removeView: function(destination) {
                var child = this._find(destination)[0];
                if (child) {
                    return this._remove(child);
                }
            },
            getView: function(destination) {
                var child = this._find(destination)[0];
                if (child) {
                    return child.view;
                }
            },
            resetViews: function(viewsToAdd) {
                _.each(this._views, this._remove, this);
                _.each(viewsToAdd, function(view, destination) {
                    this.addView(destination, view);
                }, this);
            },

            _find: function(destination) {
                var filterBy = (_.isString(destination)) ? 'destination' : 'view';
                return _.filter(this._views, function(child) {
                    return child[filterBy] === destination;
                });
            },
            _add: function(childToAdd) {
                this._views.push(childToAdd);
                this.views.push(childToAdd.view);
                childToAdd.view.parentView = this;
                this.delegateViewEvents(childToAdd.view);
            },
            _remove: function(childToRemove) {
                if (_.indexOf(this._views, childToRemove) != -1) {
                    // Update counter total
                    this._totals.decrease(childToRemove.method, childToRemove.selector);

                    // Update child indexes
                    _.each(this._views, function(child) {
                        if (child.index > childToRemove.index && child.method === childToRemove.method && child.selector === childToRemove.selector) {
                            child.index--;
                        }
                    });

                    // Remove
                    this._views = _.without(this._views, childToRemove);
                    this.views = _.without(this.views, childToRemove.view);
                    if (childToRemove.view.parentView === this) {
                        delete childToRemove.view.parentView;
                    }
                    this.undelegateViewEvents(childToRemove.view);
                    childToRemove.view.remove();
                }
            },

            ready: function(options) {
                var basePromise = Assembler.View.prototype.ready.call(this, options);
                var layoutPromises = [];
                _.each(this.views, function(view) {
                    layoutPromises.push(view.ready());
                }, this);
                return basePromise.then(function() {
                    return Backbone.$.when.apply(Backbone.$.when, layoutPromises);
                });
            },
            swapView: function(destination, viewToAdd) {
                var viewToRemove = this.getView(destination);
                var view = this;
                return viewToAdd.ready().done(function() {
                    view.removeView(viewToRemove);
                    view.addView(destination, viewToAdd);
                    view.renderViews();
                });
            },

            partial: function(method, selector, index, total, $insert) {
                $el = (selector) ? this.$el.find(selector) : this.$el;
                return partialMethods[method].call(this, $el, index, total, $insert);
            },

            render: function(options) {
                return this.renderElement(options).renderViews(options).renderState(options);
            },
            renderViews: function(options) {
                _.each(this._views, function(child) {
                    var total = this._totals.get(child.method, child.selector);
                    this.partial(child.method, child.selector, child.index, total, child.view.render(options).$el);
                    child.view.delegateEvents();
                }, this);
                return this;
            },

            attach: function(element) {
                return this.attachElement(element).attachViews().attachState();
            },
            attachViews: function() {
                _.each(this._views, function(child) {
                    var total = this._totals.get(child.method, child.selector);
                    var $el = this.partial(child.method, child.selector, child.index, total);
                    if ($el[0]) {
                        child.view.attach($el);
                    }
                }, this);
                return this;
            }
        });

        var destinationSplitter = /^(inner|outer|prepend|append|before|after)\s*(.*)$/i;
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

        function Counter() {
            this.counts = {};
        };
        Counter.prototype.key = function() {
            var args = Array.prototype.slice.call(arguments);
            return args.join('/');
        };
        Counter.prototype.increase = function() {
            var key = this.key.apply(this, arguments);
            this.counts[key] || (this.counts[key] = 0);
            return this.counts[key]++;
        };
        Counter.prototype.decrease = function() {
            var key = this.key.apply(this, arguments);
            this.counts[key] || (this.counts[key] = 0);
            return --this.counts[key];
        };
        Counter.prototype.get = function() {
            var key = this.key.apply(this, arguments);
            return this.counts[key] || 0;
        };

        return LayoutView;
    })();

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
                model: model
            });
        },
        addItemView: function(model) {
            return this.addView(this.itemDestination, this.createItemView(model));
        },
        removeItemView: function(model) {
            return this.removeView(model);
        },
        getItemView: function(model) {
            return this.getView(model);
        },
        resetItemViews: function(collection) {
            // Items have been reset completely
            _.each(this._find(this.itemDestination), this._remove, this);
            collection.each(this.addItemView, this);
        },
        sortItemViews: function(collection) {
            // Same list of items but indexes have changed
            // TODO: make this less destructive
            this.resetItemViews(collection);
        },

        // Override private _find method to support passing models to getView/removeView
        _find: function(destination) {
            if (destination instanceof Backbone.Model) {
                return _.filter(this._views, function(child) {
                    return child.view.model === destination;
                });
            } 
            return Assembler.LayoutView.prototype._find.call(this, destination);
        }
    });

    return Assembler;
}));
