/**
 * List of classes, grouped into categories.
 */
Ext.define('Docs.view.cls.Index', {
    extend: 'Ext.container.Container',
    alias: 'widget.classindex',
    requires: [
        'Docs.ContentGrabber'
    ],
    mixins: ['Docs.view.Scrolling'],
    cls: 'class-categories iScroll',
    margin: '15 10',
    autoScroll: true,

    initComponent: function() {
        this.tpl = new Ext.XTemplate(
            '<h1 class="top" style="padding-bottom: 10px">Class Documentation</h1>',
            '<tpl if="notice">',
                '<div class="notice">{notice}</div>',
            '</tpl>',
            '{categories}',
            '{news}'
        );
        this.data = {
            notice: Docs.data.message || Docs.ContentGrabber.get("notice-text"),
            categories: Docs.ContentGrabber.get("categories-content"),
            news: Docs.ContentGrabber.get("news-content")
        };

        this.callParent(arguments);
    },

    afterRender: function() {
        this.callParent(arguments);
    },

    /**
     * Returns tab config for classes page if at least one class.
     * @return {Object}
     */
    getTab: function() {
        var enabled = (Docs.data.classes || []).length > 0;
        return enabled ? {text: 'Class Documentation', href: '#!/class', tooltip: 'Class Documentation'} : false;
    }
});
