(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['underscore', 'handlebars'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('underscore'), require('handlebars'));
    } else {
        root.Assembler.HandlebarsMixin = factory(root._, root.Handlebars);
    }
}(this, function(_, Handlebars) {
    return {
        setTemplate: function(template) {
            if (!_.isFunction(template)) {
                template = Handlebars.compile(template);
            }
            this.template = template;
            return this;
        }
    };
}));
