/**
 * Tree for classes.
 */
Ext.define('Docs.view.cls.Tree', {
    extend: 'Docs.view.DocTree',
    alias: 'widget.classtree',
    requires: [
        'Docs.view.cls.PackageLogic',
        'Docs.view.cls.InheritanceLogic',
        'Docs.Settings'
    ],

    /**
     * @cfg {Object[]} data (required)
     * An array of classes
     */

    initComponent: function() {
        this.setLogic(Docs.Settings.get("classTreeLogic"));

        this.dockedItems = [
            {
                xtype: 'container',
                dock: 'bottom',
                cls: 'cls-grouping',
                html: [
                    this.makeButtonHtml("PackageLogic", "By Package"),
                    this.makeButtonHtml("InheritanceLogic", "By Inheritance")
                ].join('')
            }
        ];

        this.on("afterrender", this.setupButtonClickHandler, this);

        this.callParent();
    },

    makeButtonHtml: function(logic, text) {
        return Ext.String.format(
            '<button class="{0} {1}">{2}</button>',
            logic,
            Docs.Settings.get("classTreeLogic") === logic ? "selected" : "",
            text
        );
    },

    setupButtonClickHandler: function() {
        this.el.addListener('click', function(e, el) {
            var clicked = Ext.get(el),
            selected = Ext.get(Ext.query('.cls-grouping button.selected')[0]);

            if (selected.dom === clicked.dom) {
                return;
            }

            selected.removeCls('selected');
            clicked.addCls('selected');

            if (clicked.hasCls('PackageLogic')) {
                this.setLogic("PackageLogic", Docs.Settings.get("showPrivateClasses"));
            } else {
                this.setLogic("InheritanceLogic", Docs.Settings.get("showPrivateClasses"));
            }
        }, this, {
            delegate: 'button'
        });
    },

    setLogic: function(logic) {
        Docs.Settings.set("classTreeLogic", logic);

        var tree = new Docs.view.cls[logic]({classes: this.data});
        if (this.root) {
            // remember the current selection
            var selected = this.getSelectionModel().getLastSelected();
            // create new treestructure
            var nodes = tree.create();
            this.expandLonelyNode(nodes.root);
            this.setRootNode(nodes.root);
            this.initNodeLinks();

            // re-establish the previous selection
            selected && this.selectUrl(selected.raw.url);
        }
        else {
            var nodes = tree.create();
            this.root = nodes.root;
            this.expandLonelyNode(this.root);
        }
    },

    // When only one expandable node at root level, expand it
    expandLonelyNode: function(root) {
        var expandableNodes = Ext.Array.filter(root.children, function(node) {
            return node.children.length > 0;
        });
        if (expandableNodes.length == 1) {
            expandableNodes[0].expanded = true;
        }
    },

    /**
     * Returns node data, looking also from private nodes.
     * @param {String} url
     * @return {Object}
     */
    findRecordByUrl: function(url) {
        return this.callParent([url]);
    }
});
