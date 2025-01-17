/**
 * Toolbar with menus providing quick access to class members.
 */
Ext.define('Docs.view.prc.Toolbar', {
    extend: 'Ext.toolbar.Toolbar',
    requires: [
        'Docs.view.HoverMenuButton',
        'Docs.Settings',
        'Ext.form.field.Checkbox'
    ],

    dock: 'top',
    cls: 'member-links',

    /**
     * @cfg {Object} docClass
     * Documentation for a class.
     */
    docClass: {},

    initComponent: function() {
        this.addEvents(
            /**
             * @event buttonclick
             * Fired when one of the toolbar HoverMenuButtons is clicked.
             * @param {String} type Type of button that was clicked "cfg", "method", "event", etc
             */
            "menubuttonclick",
            /**
             * @event filter
             * Fires when text typed to filter, or one of the hide-checkboxes clicked.
             * @param {String} search  The search text.
             * @param {Object} show  Flags which members to show:
             * @param {Boolean} show.public
             * @param {Boolean} show.protected
             * @param {Boolean} show.private
             * @param {Boolean} show.inherited
             */
            "filter",
            /**
             * @event toggleExpanded
             * Fires expandAll/collapseAll buttons clicked.
             * @param {Boolean} expand  True to expand all, false to collapse all.
             */
            "toggleExpanded"
        );

        this.items = [];
        this.memberButtons = {};

        Ext.Array.forEach(Docs.data.memberTypes, function(type) {
            // combine both static and instance members into one alphabetically sorted array
            var members = Ext.Array.filter(this.docClass.members, function(m) {
                return m.tagname === type.name;
            });
            members.sort(function(a, b) {
                if (a.name === "constructor" && a.tagname === "method") {
                    return -1;
                }
                return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0);
            });

            if (members.length > 0) {
                var btn = this.createMemberButton({
                    text: type.toolbar_title || type.title,
                    type: type.name,
                    members: members
                });
                this.memberButtons[type.name] = btn;
                this.items.push(btn);
            }
        }, this);

        this.checkItems = {
            "public": this.createCb("Public", "public"),
            "private": this.createCb("Private", "private"),
            "deprecated": this.createCb("Deprecated", "deprecated"),
            "internal": this.createCb("Internal", "internal")
        };

        var self = this;
        this.items = this.items.concat([
            { xtype: 'tbfill' },
            this.filterField = Ext.widget("triggerfield", {
                triggerCls: 'reset',
                cls: 'member-filter',
                hideTrigger: true,
                emptyText: 'Filter procedure members',
                enableKeyEvents: true,
                width: 150,
                listeners: {
                    keyup: function(cmp) {
                        this.fireEvent("filter", cmp.getValue(), this.getShowFlags());
                        cmp.setHideTrigger(cmp.getValue().length === 0);
                    },
                    specialkey: function(cmp, event) {
                        if (event.keyCode === Ext.EventObject.ESC) {
                            cmp.reset();
                            this.fireEvent("filter", "", this.getShowFlags());
                        }
                    },
                    scope: this
                },
                onTriggerClick: function() {
                    this.reset();
                    this.focus();
                    self.fireEvent('filter', '', self.getShowFlags());
                    this.setHideTrigger(true);
                }
            }),
            { xtype: 'tbspacer', width: 10 },
            {
                xtype: 'button',
                text: 'Show',
                menu: [
                    this.checkItems['public'],
                    this.checkItems['private'],
                    '-',
                    this.checkItems['deprecated'],
                    this.checkItems['internal']
                ]
            },
            {
                xtype: 'button',
                iconCls: 'expand-all-members',
                tooltip: "Expand all",
                enableToggle: true,
                toggleHandler: function(btn, pressed) {
                    btn.setIconCls(pressed ? 'collapse-all-members' : 'expand-all-members');
                    this.fireEvent("toggleExpanded", pressed);
                },
                scope: this
            }
        ]);

        this.callParent(arguments);
    },

    getShowFlags: function() {
        var flags = {};
        for (var i in this.checkItems) {
            flags[i] = this.checkItems[i].checked;
        }
        return flags;
    },

    createCb: function(text, type) {
        return Ext.widget('menucheckitem', {
            text: text,
            checked: Docs.Settings.get("show")[type],
            listeners: {
                checkchange: function() {
                    this.fireEvent("filter", this.filterField.getValue(), this.getShowFlags());
                },
                scope: this
            }
        });
    },

    createMemberButton: function(cfg) {
        var data = Ext.Array.map(cfg.members, function(m) {
            return this.createLinkRecord(this.docClass.name, m);
        }, this);

        return Ext.create('Docs.view.HoverMenuButton', {
            text: cfg.text,
            cls: 'icon-'+cfg.type,
            store: this.createStore(data),
            showCount: true,
            listeners: {
                click: function() {
                    this.fireEvent('menubuttonclick', cfg.type);
                },
                scope: this
            }
        });
    },

    // creates store tha holds link records
    createStore: function(records) {
        var store = Ext.create('Ext.data.Store', {
            fields: ['id', 'url', 'label', 'inherited', 'meta', 'baseUrl']
        });
        store.add(records);
        return store;
    },

    // Creates link object referencing a class member
    createLinkRecord: function(cls, member) {
        return {
            id: member.id,
            url: cls + "-" + member.id,
            label: member.name,
            inherited: member.owner !== cls,
            meta: member.meta,
            baseUrl: "procedure"
        };
    },

    /**
     * Show or hides members in dropdown menus.
     * @param {Object} show
     * @param {Boolean} isSearch
     * @param {RegExp} re
     */
    showMenuItems: function(show, isSearch, re) {
        Ext.Array.forEach(Docs.data.memberTypes, function(type) {
            var btn = this.memberButtons[type.name];
            if (btn && typeof btn === 'object') {
                btn.getStore().filterBy(function(m) {
                    return !(
                        !show['public']    && !(m.get("meta")["private"]) ||
                        !show['private']   && m.get("meta")["private"] ||
                        !show['deprecated']   && m.get("meta")["deprecated"] ||
                        !show['internal']   && m.get("meta")["internal"] ||
                        isSearch           && !re.test(m.get("label"))
                    );
                });
                // HACK!!!
                // In Ext JS 4.1 filtering the stores causes the menus
                // to become visible. But the visibility behaves badly
                // - one has to call #show first or #hide won't have
                // an effect.
                var menu = btn.menu;
                if (menu && Ext.getVersion().version >= "4.1.0") {
                    menu.show();
                    menu.hide();
                }
            }
        }, this);
    },

    /**
     * Returns the current text in filter field.
     * @return {String}
     */
    getFilterValue: function() {
        return this.filterField.getValue();
    }
});
