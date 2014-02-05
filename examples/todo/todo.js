_.extend(Assembler.View.prototype, Assembler.HandlebarsMixin);

var Todo = Backbone.Model.extend({
    defaults: {
        title: '',
        done: false
    },
    validate: function(attrs, options) {
        return !attrs.title;
    }
});

var TodoItemView = Assembler.View.extend({
    tagName: 'li',
    template: '<label><input type="checkbox"{{#if done}} checked="checked"{{/if}} />{{title}}</label>  <button class="delete">&times;</button>',
    events: {
        'change input[type=checkbox]': function(event) {
            this.model.set('done', event.target.checked);
        },
        'click .delete': function(event) {
            this.model.destroy();
        }
    },
    modelEvents: {
        'change:done': 'render'
    },
    render: function() {
        this.$el.toggleClass('is-done', this.model.get('done'));

        return Assembler.View.prototype.render.call(this);
    }
});

var TodoListView = Assembler.ListView.extend({
    className: 'container',
    template: '<h1>Todos</h1>  <form><input type="text" placeholder="What do you need to do?"></form>  <ul></ul>  {{#if completed}}<button class="clear">Clear {{completed}} completed</button>{{/if}}',
    itemView: TodoItemView,
    itemDestination: 'append ul',
    dataDecorator: function(data) {
        data.completed = this.collection.where({done: true}).length;
        return data;
    },
    events: {
        'submit form': function(event) {
            event.preventDefault();
            var todo = new Todo({
                title: $('input[type=text]').val()
            });
            if (todo.isValid()) {
                this.collection.add(todo);
            }
        },
        'click .clear': function(event) {
            this.collection.remove(this.collection.where({done: true}));
        }
    },
    collectionEvents: {
        'add remove reset sort change': 'render'
    }
});

$(document).ready(function() {
    var allTodos = new Backbone.Collection([
        {title: 'Book flights to Paris', done: true},
        {title: 'Pack for Fashion Week'},
        {title: 'Visit Rick Owens showroom'}
    ], {model: Todo});

    var todoView = new TodoListView({
        collection: allTodos
    });

    todoView.render().$el.appendTo('body');
});
