/**
 * Controller responsible for loading classes
 */
Ext.define('Docs.controller.Classes', {
    extend: 'Docs.controller.Content',
    baseUrl: '#!/class',
    title: 'API Documentation',

    requires: [
        'Docs.History',
        'Docs.Syntax',
        'Docs.ClassRegistry'
    ],

    refs: [
        {
            ref: 'viewport',
            selector: '#viewport'
        },
        {
            ref: 'index',
            selector: '#classindex'
        },
        {
            ref: 'header',
            selector: 'classheader'
        },
        {
            ref: 'overview',
            selector: 'classoverview'
        },
        {
            ref: 'tabPanel',
            selector: 'classtabpanel'
        },
        {
            ref: 'tree',
            selector: '#classtree'
        },
        {
            ref: 'favoritesGrid',
            selector: '#favorites-grid'
        }
    ],

    cache: {},

    init: function() {
        this.addEvents(
            /**
             * @event showIndex  Fired after index is shown.
             */
            "showIndex",

            /**
             * @event showClass
             * Fired after class shown. Used for analytics event tracking.
             * @param {String} cls  name of the class.
             * @param {Object} options
             * @param {Boolean} options.reRendered true if the class was re-rendered
             */
            "showClass",

            /**
             * @event showMember
             * Fired after class member scrolled to view. Used for analytics event tracking.
             * @param {String} cls  name of the class.
             * @param {String} anchor  name of the member in form type-name like "method-bind".
             */
            "showMember"
        );

        Ext.getBody().addListener('click', function(event, el) {
            this.handleUrlClick(decodeURI(el.href), event);
        }, this, {
            preventDefault: true,
            delegate: '.docClass'
        });

        this.control({
            'classtree': {
                urlclick: function(url, event) {
                    this.handleUrlClick(url, event, this.getTree());
                }
            },

            'toolbar': {
                toggleExpanded: function(expanded) {
                    this.getOverview().setAllMembersExpanded(expanded);
                }
            },

            'classoverview': {
                afterrender: function(cmp) {
                    // Expand member when clicked
                    cmp.el.addListener('click', function(cmp, el) {
                        var member = Ext.get(el).up('.member'),
                            docClass = member.down('.meta .defined-in'),
                            clsName = docClass.getAttribute('rel'),
                            memberName = member.getAttribute('id');

                        if (this.getOverview().isMemberExpanded(memberName)) {
                            this.setExpanded(memberName, false);
                        }
                        else {
                            this.setExpanded(memberName, true);
                            this.fireEvent('showMember', clsName, memberName);
                        }
                    }, this, {
                        preventDefault: true,
                        delegate: '.expandable'
                    });

                    // Do nothing when clicking on not-expandable items
                    cmp.el.addListener('click', Ext.emptyFn, this, {
                        preventDefault: true,
                        delegate: '.not-expandable'
                    });
                }
            },

            'treecontainer': {
                afterrender: function(cmp) {
                    cmp.el.addListener('dblclick', function() {
                        if (cmp.getWidth() < 30) {
                            cmp.setWidth(cmp.expandedWidth);
                        } else {
                            cmp.expandedWidth = cmp.getWidth();
                            cmp.setWidth(20);
                        }
                    }, this, {
                        delegate: '.x-resizable-handle'
                    });
                }
            },

            'doctabs': {
                tabClose: function(url) {
                    this.getOverview().eraseScrollContext(url);
                }
            }
        });
    },

    // Expands the member and remembers the expanded state of a member
    // of current class
    setExpanded: function(member, expanded) {
        var cls = this.currentCls;
        if (!cls.expanded) {
            cls.expanded = {};
        }

        this.getOverview().setMemberExpanded(member, expanded);

        if (expanded) {
            cls.expanded[member] = expanded;
        }
        else {
            delete cls.expanded[member];
        }
    },

    // Expands
    applyExpanded: function(cls) {
        Ext.Object.each(cls.expanded || {}, function(member) {
            Ext.get(member).addCls("open");
        }, this);
    },

    // We don't want to select the class that was opened in another window,
    // so restore the previous selection.
    handleUrlClick: function(url, event, view) {
        // If not for me bail
        if (!(/#!?\/class/.test(url))) 
            return false;

        url = Docs.History.cleanUrl(url);

        if (this.opensNewWindow(event)) {
            window.open(url);
            view && view.selectUrl(this.currentCls ? "#!/class/"+this.currentCls.name : "");
        }
        else {
            this.loadClass(url);
        }
    },

    /**
     * Loads main page.
     *
     * @param {Boolean} noHistory  true to disable adding entry to browser history
     */
    loadIndex: function(noHistory) {
        Ext.getCmp('treecontainer').showTree('classtree');
        this.callParent(arguments);
        this.fireEvent('showIndex');
    },

    /**
     * Loads class.
     *
     * @param {String} url  name of the class + optionally name of the method, separated with dash.
     * @param {Boolean} noHistory  true to disable adding entry to browser history
     */
    loadClass: function(url, noHistory) {
        Ext.getCmp('card-panel').layout.setActiveItem('classcontainer');
        Ext.getCmp('treecontainer').showTree('classtree');

        noHistory || Docs.History.push(url);

        // separate class and member name
        var matches = url.match(/^#!\/class\/(.*?)(?:-(.*))?$/);
        var cls = Docs.ClassRegistry.canonicalName(matches[1]);
        var member = matches[2];

        if (this.getOverview()) {
            this.getOverview().setLoading(true);
        }

        if (this.cache[cls]) {
            this.showClass(this.cache[cls], member);
        }
        else {
            this.cache[cls] = "in-progress";
            Ext.data.JsonP.request({
                url: this.getBaseUrl() + '/output/classes/' + cls + '.js',
                callbackName: cls.replace(/\./g, '_'),
                success: function(json, opts) {
                    this.cache[cls] = json;
                    this.showClass(json, member);
                },
                failure: function(response, opts) {
                    this.cache[cls] = false;
                    this.getOverview().setLoading(false);
                    this.getController('Failure').show404("Class <b>"+Ext.String.htmlEncode(cls)+"</b> was not found.");
                },
                scope: this
            });
        }
    },

    showClass: function(cls, anchor) {
        var reRendered = false;

        if (cls === "in-progress") {
            return;
        }
        this.getOverview().setLoading(false);

        this.getViewport().setPageTitle(cls.name);
        if (this.currentCls !== cls) {
            this.currentCls = cls;
            this.getHeader().load(cls);
            this.getOverview().load(cls);
            this.applyExpanded(cls);
            reRendered = true;
        }
        this.currentCls = cls;
        this.getOverview().setScrollContext("#!/class/"+cls.name);

        if (anchor) {
            this.getOverview().scrollToEl("#" + anchor);
            this.fireEvent('showMember', cls.name, anchor);
        }
        else {
            this.getOverview().restoreScrollState();
        }

        this.getTree().selectUrl("#!/class/"+cls.name);
        this.fireEvent('showClass', cls.name, {reRendered: reRendered});
    }

});
