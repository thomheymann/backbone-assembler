(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['handlebars'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('handlebars'));
    } else {
        root.Assembler.HandlebarsMixin = factory(root.Handlebars);
    }
}(this, function(Handlebars) {
    return {
        setTemplate: function(template) {
            if (typeof template !== 'function') {
                template = Handlebars.compile(template);
            }
            this.template = template;
            return this;
        }
    };
}));
