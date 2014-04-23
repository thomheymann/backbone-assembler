# Backbone.Assembler

Assembler is a plugin for [Backbone](http://backbonejs.org) that makes it easy to manage nested views. 


## Motivation

Backbone has no native abstraction layer for working with nested views, and even though this is a very common problem and there are a lot of great and well-maintained libraries, none of them ticked all our boxes: 

#### Dumb Templates

In order to maintain a clear separation of concerns Assembler uses templates in the dumbest way possible - They do not know about child views so no controller/view responsibilities like view hierarchies, data loading, contexts or filters leak into your templates. Instead layouts are managed directly in the view, which allows you to add/remove/swap/position/observe child views programmatically as well as giving you the flexibility to use any template engine of your choice (or even raw string concatenation). 

#### client-side re-attachment

Assembler has been designed from the ground up to render nested views server-side and re-attach them client side. This allows you to build one page applications, which serve fully rendered markup without having to duplicate your presentation logic. 

#### No Conflict

Assembler does not augment Backbone in any way and allows you to integrate it into your existing Backbone applications without breaking working code. 


## Overview

The API is inspired by Backbone's events definition so creating layouts using Assembler looks like this:

```javascript
var mainView = new Assembler.LayoutView({
    template: '<header><h1><%= title %></h1></header> <div class="content" role="main"></div>',
    views: {
        'append header': navigationView,
        'inner .content': contentView
    }
});

mainView.render().$el.appendTo('body');
```

In the example above, `append header` is the destination and `navigationView` is the view instance to be inserted at the target selector. 

#### Destinations

Destination strings are composed of an insert method and can optionally be followed by a CSS selector that identifies the target element. If no target selector is provided the view's root element itself becomes the target. (Useful for creating flat lists)

The following insert methods are supported: 

* `inner` - Replaces the contents of the target element with the child view
* `outer` - Replaces the target element with the child view
* `prepend` - Inserts the child view at the beginning of the target element
* `append` - Inserts the child view at the end of the target element
* `before` - Inserts the child view before the target element
* `after` - Inserts the child view after the target element

#### Dynamic Layouts

Child views can be added or removed programmatically using:

* `.addView(destination, view)` - Adds a new child view to the layout
* `.removeView(destination)` - Removes an existing child view from the layout
* `.swapView(destination, view)` - Waits until the view to be inserted is ready to be rendered before removing the current child view from, and inserting the new child view to, the layout. 

#### Classes Overview

Assembler exposes the following classes:

* `Assembler.View` - Implements basic API and rendering flow
* `Assembler.LayoutView` - Used to create layouts
* `Assembler.ListView` - Used to create lists and composite views (templated lists)

To find out more check out the [full documentation](#api) below or have a look at the [example project](examples/todo) in the repo. 


## Dependencies

* [Backbone](http://backbonejs.org) (>= 1.0)
* [underscore](http://underscorejs.org) (>= 1.5)
* [jquery](http://jquery.com) (>= 1.10) or [cheerio](http://matthewmueller.github.io/cheerio/) (>= 0.12)


## Install

Download: [Latest release](https://github.com/NET-A-PORTER/backbone-assembler/releases)

Or install using npm:

    $ npm install backbone-assembler

Or install using bower:

    $ bower install backbone-assembler

Mixins: 

* [backbone-assembler-handlebars](https://github.com/NET-A-PORTER/backbone-assembler-handlebars)


## Test

Open the [test runner](test) in your browser or run using PhantomJS:

    $ npm install
    $ npm test


## API

* [View](#assemblerview)
    - [initialize](#initializeoptions)
    - [modelEvents](#modelevents)
    - [collectionEvents](#collectionevents)
    - [setModel](#setmodelmodel)
    - [setCollection](#setcollectioncollection)
    - [setTemplate](#settemplatetemplate)
    - [toJSON](#tojson) with [dataDecorator](#datadecoratordata)
    - [toHTML](#tohtml)
    - [render](#renderoptions)
    - [attach](#attachelement)
    - [lazy](#lazy)
    - [voidRendered](#voidrendered)
    - [ready](#readyoptions) with [promiseCoupler](#promisecouplerpromise-options)

* [LayoutView](#assemblerlayoutview)
    - [initialize](#initializeoptions)
    - [viewEvents](#viewevents)
    - [getView](#getviewdestination)
    - [addView](#addviewdestination-view)
    - [removeView](#removeviewdestination)
    - [resetViews](#resetviewsviews)
    - [swapView](#swapviewdestination-view)

* [ListView](#assemblerlistview)
    - [initialize](#initializeoptions)
    - [itemView](#itemview)
    - [itemDestination](#itemdestination)
    - [getItemView](#getitemviewmodel)
    - [addItemView](#additemviewmodel) with [createItemView](#createitemviewmodel)
    - [removeItemView](#removeitemviewmodel)
    - [resetItemView](#resetitemviewcollection)
    - [sortItemView](#sortitemviewcollection)

### Assembler.View

_(extends [Backone.View](http://backbonejs.org/#View))_

This is the base view class implementing the basic API and rendering flow. 

#### .initialize(options)

Pass in the following options to attach them directly to the view:

* `options.modelEvents` - Overrides [modelEvents](#modelevents)
* `options.collectionEvents` - Overrides [collectionEvents](#collectionevents)
* `options.lazy` - Overrides [lazy](#lazy)

#### .modelEvents
#### .collectionEvents

Convenience properties allowing the view to react to [model and collection events](http://backbonejs.org/#Events-catalog). 

Events added using these properties are automatically (un)bound when re-assigning models/collections using [setModel](#setmodelmodel) and [setCollection](#setcollectioncollection).

Usage Example:

```javascript
var View = Assembler.View.extend({
    modelEvents: {
        'change': 'render' // Render view when model data changes
    }
});
```

#### .setModel(model)
#### .setCollection(collection)

Setter methods used to re-assign the view's model/collection. 

Automatically (un)binds [modelEvents](#modelevents) and [collectionEvents](#collectionevents). 

#### .setTemplate(template)

Setter method used to re-assign the view's template. 

Passed `template` can either be a function taking a data argument or a string, which will be automatically compiled using the template engine of your choice. (Defaults to [underscore templates](http://underscorejs.org/#template))

Override this method to add support for different template engines as follows:

```javascript
var HandlebarsView = Assembler.View.extend({
    setTemplate: function(template) {
        if (!_.isFunction(template)) {
            template = Handlebars.compile(template);
        }
        this.template = template;
        return this;
    }
});
```

Or use the [Handlebars mixin](https://github.com/NET-A-PORTER/backbone-assembler-handlebars):

```javascript
_.extend(Assembler.View.prototype, Assembler.HandlebarsMixin);
```

#### .toJSON()

Returns all data required to render the template. Automatically delegates to `model.toJSON()` if set.

#### .dataDecorator(data)

no-op allowing you to add/transform data before it is passed to the template. Use this for view specific transformation keeping any business logic in the model itself. 

Usage Example - Add translations:

```javascript
var I18nView = Assembler.View.extend({
    template: '<p><%= message %></p>',
    dataDecorator: function(data) {
        data.message = i18n('There are {0} posts', this.collection.length);
        return data;
    }
});
```

#### .toHTML()

Returns a string of fully rendered markup ready for injection into the DOM. 

#### .render(options)

Renders markup and injects result into the view's DOM element. 

no-op if view is marked as [lazy](#lazy) and model data has not changed since last render call (unless called with `options.force` enabled). 

#### .attach(element)

The inverse of `.render()` - Call this to re-attach your complete layout to all DOM elements when you can guarantee that all your model/collection data fully reflects what was used to render the markup server side. 

Passed `element` can be a DOM element or CSS selector. 

#### .lazy

_(Default: false)_

Optimization setting which (if enabled) ensures that the template is only rendered if model data changed since last render call.

#### .voidRendered()

Manually mark [lazy](#lazy) views ready for re-rendering. (Called automatically whenever the view's model data changes)

Keep in mind that this doesn't actually render anything - It just ensures the next render call isn't ignored. 

#### .ready(options)

In order to help build self-contained modules Assembler assumes that each view knows what data is required to render itself and when that data is available. This is usually the model and/or collection used by the view but could also include an asynchronously fetched template or additional data sources like i18n dictionaries. 

Call this method to check if the view is ready to be rendered. Automatically delegates to `model.fetch` and `collection.fetch` passing on any `options` set. 

Calling ready on a layout propagates down to all its child views chaining together all their ready promises. This makes it easy to work with deeply nested layouts, which can only be rendered once all their child views (and all of their child view's child views and so on) are ready.

Usage Example:

```javascript
layout
.ready()
.done(function() {
    layout.render();
});
```

Override this method if you want to set any default [model/collection fetch options](http://backbonejs.org/#Model-fetch):

```javascript
var View = Assembler.View.extend({
    ready: function(options) {
        // Reset collection after each fetch by default
        return Assembler.View.prototype.ready.call(this, _.defaults(options || (options = {}), {
            reset: true
        }));
    }
});
```

#### .promiseCoupler(promise, options)

no-op allowing you to chain/parallelise additional promises or react to success/error states. 

Usage Example 1 - View requires i18n dictionaries to render itself:

```javascript
var MessageView = Assembler.View.extend({
    promiseCoupler: function(promise, options) {
        // Fetch i18n dictionaries in parallel
        return $.when(promise, fetchDictionaries());
    }
});
```

Usage Example 2 - Fetching a model with embedded collection data required to populate a list view:

```javascript
var PackageView = Assembler.LayoutView.extend({
    promiseCoupler: function(promise, options) {
        var contributorsView = this.getView('inner ul.contributors');
        if (contributorsView && !contributorsView.collection) {
            var model = this.model;
            return promise.then(function() {
                // Now that the model has been fetched we can extract our contributors
                // collection, assign it to the list view and chain its ready promise.
                var collection = new Backbone.Collection(model.get('contributors'));
                return contributorsView.setCollection(collection).ready();
            });
        }
        return promise;
    }
});
```


### Assembler.LayoutView

_(extends [Assembler.View](#assemblerview))_

Used to create layouts (nested views).

#### .initialize(options)

Pass in the following options to attach them directly to the view:

* `options.viewEvents` - Overrides [viewEvents](#viewevents)
* `options.views` - Passed directly to [resetViews](#resetviewsviews)

#### .viewEvents

Convenience property allowing the layout to react to events emitted by its child views. 

Events added using this property are automatically (un)bound when adding/removing child views using [addView](#addviewdestination-view), [removeView](#addviewdestination), [resetView](#resetviewsviews).

Usage Example:

```javascript
var AccordionView = Assembler.LayoutView.extend({
    viewEvents: {
        'close': 'openNext'
    },
    openNext: function(current) {
        var nextIndex = (this.collection.indexOf(current)+1) % this.collection.length;
        this.getItemView(this.collection.at(nextIndex)).open();
    }
});

var AccordionItemView = Assembler.View.extend({
    open: function() {
        this.$el.addClass('is-open');
        this.trigger('open', this.model);
    },
    close: function() {
        this.$el.removeClass('is-open');
        this.trigger('close', this.model);
    }
});
```

#### .getView(destination)

Returns first child view found at `destination`. 

#### .addView(destination, view)

Adds `view` to the layout at `destination`. 

#### .removeView(destination)

Removes first child view found at `destination` from the layout. 

Alternatively pass in the view instance to be removed. 

#### .resetViews(views)

Removes all child views from the layout and adds those passed in `views` object (if set). 

```javascript
mainView.resetViews({
    'append header': navigationView,
    'inner .content': contentView
});
```

#### .swapView(destination, view)

Similar to [addView](#addviewdestination-view) except that Assembler waits until the view to be inserted is ready to be rendered (all model/collection data has been fetched) before removing the current child view from, and inserting the new child view to, the layout. 

Basically a convenience method for manually calling [ready](#readyoptions), [removeView](#removeviewdestination), [addView](#addviewdestination-view) and [render](#render-options).


### Assembler.ListView

_(extends [Assembler.LayoutView](#assemblerlayoutview))_

Special case of a layout used to create lists.

List views are tightly coupled to their collection and will automatically create and add view instances of type `itemView` for every model in `collection` into the layout at `itemDestination`:

```javascript
var linksView = new Assembler.ListView({
    tagName: 'ul',
    itemView: Assembler.View.extend({tagName: 'li'}),
    collection: links,
    collectionEvents: {
        'add remove reset sort': 'render'
    }
});
```

A list's item views are fully managed by its collection so don't add/remove them manually using any layout methods. Instead add/remove/reset/sort the collection directly. Feel free to add unrelated child views though as you would in any other layout. 

Furthermore, since list views are essentially layout views with added sugar for collections, they can also be used to create composite views (templated lists) by setting a `template` and overriding the default `itemDestination` like so:

```javascript
var linksView = new Assembler.ListView({
    template: '<ul></ul> <aside></aside>',
    itemView: Assembler.View.extend({tagName: 'li'}),
    itemDestination: 'append ul',
    collection: links,
    collectionEvents: {
        'add remove reset sort': 'render'
    },
    views: {
        "inner aside": relatedView
    }
});
```

When working with large collections it is useful to debounce calls to render in your event listeners to avoid having to re-render the whole list for each `add` and `remove` event emitted. This is because collections fire events for each model individually even if added/removed in one go (e.g. after a fetch/reset/sort). The following technique can be used to ensure the list is only being rendered once after the last model has been added:

```javascript
var View = Assembler.ListView.extend({
    collectionEvents: {
        'add remove reset sort': function() {
            (this._debouncedRender || (this._debouncedRender = _.debounce(this.render))).call(this);
        }
    }
});
```

#### .initialize(options)

Pass in the following options to attach them directly to the view:

* `options.itemView` - Overrides [itemView](#itemview)
* `options.itemDestination` - Overrides [itemDestination](#itemdestination)

#### .itemView

_(Default: Assembler.View)_

View class used for each item in the list. 

#### .itemDestination

_(Default: "append")_

Destination used to insert item views into the layout. 

Override this property to change the target element. (Note: Insert method should always be `append`) 

#### .getItemView(model)

Returns the item view that belongs to the passed `model`.

Alternatively pass in the index of the item view. 

#### .createItemView(model)

Returns a new item view instance for the passed `model`. 

Override this method to pass extra options when instantiating item views:

```javascript
var View = Assembler.ListView({
    createItemView: function(model) {
        return new this.itemView({
            model: model,
            something: 'else'
        });
    }
});
```

#### .addItemView(model)
#### .removeItemView(model)
#### .resetItemView(collection)
#### .sortItemView(collection)

Called automatically on `add`, `remove`, `reset` and `sort` events - Do not call these methods manually!

Instead create an item view by adding its model to the collection:

```javascript
listView.collection.add(model);
```

Remove an item view by removing its model from the collection:

```javascript
listView.collection.remove(model);
```

Reset all item views by resetting the collection:

```javascript
listView.collection.reset(collection);
```

Sort all item views by sorting the collection:

```javascript
listView.collection.sort();
```
