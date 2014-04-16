/**
 * This file contains an ExtJS user extension for Blockly library
 * Note that this doesn't use the standard Blockly library since this
 * requires the google closure compiler. Instead an Ext port is provided.
 * @author Chris Jackson
 */


Ext.define('Ext.ux.blockly.Blockly', {
    extend: 'Ext.panel.Panel',
    closable: true,
    layout: 'border',
    toolbox: null,
    trashcan: true,
    header: false,
    selectedRecord: null,
    autoDestroy: true,

    initComponent: function () {
        var me = this;

        var toolboxGrids = [];

        // Avoid undeclared error
        if(me.blockly == null)
            me.blockly = {};

        this.items = [];

        if (me.blockly.toolbox == true) {
            // Create an array of category stores and grids.
            for (var i = 0; i < me.blockly.toolboxCategories.length; i++) {
                // (Unfortunately!) We need to use separate stores with an accordion.
                // If we just use a filter, there is a problem as for a short
                // time two grids are in view and we then see the same view.
                var store = Ext.create('Ext.data.ArrayStore', {
                    fields: [
                        {name: 'category'},
                        {name: 'block'},
                        {name: 'svg'},
                        {name: 'name'}
                    ]
                });


                // Load any blocks specified in the toolboxTool array
                // These will be added to any from the categories
                for (var t = 0; t < me.blockly.toolboxTools.length; t++) {
                    if (me.blockly.toolboxTools[t].category === me.blockly.toolboxCategories[i].name) {
                        store.add(me.blockly.toolboxTools[t]);
                    }
                }

                // Create the separate lists for the accordion panels
                var cat = Ext.create('Ext.grid.Panel', {
                    title: me.blockly.toolboxCategories[i].title,
                    icon: me.blockly.toolboxCategories[i].icon,
                    tooltip: me.blockly.toolboxCategories[i].tooltip,
                    category: me.blockly.toolboxCategories[i].name,
                    hideHeaders: true,
                    store: store,
                    collapsible: false,
                    multiSelect: false,
                    disableSelection: true,
                    layout: 'fit',
                    viewConfig: {
                        stripeRows: true,
                        enableTextSelection: false,
                        markDirty: false
                    },
                    columns: [
                        {
                            flex: 1,
                            dataIndex: 'svg'
                        }
                    ],
                    listeners: {
                        render: function (grid) {
                            // TODO: This doesn't work!
//                            Ext.create('Ext.tip.ToolTip', {
//                                target: grid.getHeader(),
//                                html: grid.tooltip
//                            });

                            grid.dragZone = Ext.create('Ext.dd.DragZone', grid.getEl(), {
                                // On receipt of a mousedown event, see if it is within a draggable element.
                                // Return a drag data object if so. The data object can contain arbitrary application
                                // data, but it should also contain a DOM element in the ddel property to provide
                                // a proxy to drag.
                                getDragData: function (e) {
                                    var sourceEl = e.getTarget("svg", 10);
                                    if (sourceEl) {
                                        var dragView = sourceEl.cloneNode(true);
                                        dragView.style.width=dragView.getAttribute("width");
                                        dragView.id = Ext.id();
                                        return grid.dragData = {
                                            sourceEl: sourceEl,
                                            repairXY: Ext.fly(sourceEl).getXY(),
                                            ddel: dragView,
                                            block: me.selectedRecord.get("block")
                                        };
                                    }
                                },

                                // Provide coordinates for the proxy to slide back to on failed drag.
                                // This is the original XY coordinates of the draggable element.
                                getRepairXY: function () {
                                    return this.dragData.repairXY;
                                }
                            });
                        },
                        beforecellmousedown: function (grid, td, cellIndex, record, tr, rowIndex, e, eOpts) {
                            // We use this event to record the block that we're potentially about to drag...
                            me.selectedRecord = record;
                        },
                        itemdblclick: function (grid, record) {
                            // Double click - just add this block to the workspace
                            if (record == null)
                                return;

                            var block = Blockly.Xml.textToDom(record.get("block"));
                            Blockly.Xml.domToBlock(Blockly.getMainWorkspace(), block.childNodes[0]);
                        }
                    }
                });

                toolboxGrids.push(cat);
            }

            // Create the toolbox accordion and add all the grids
            var accordion = Ext.create('Ext.Panel', {
                split: true,
                border: true,
                region: 'west',
                autoDestroy: true,
                flex: 1,
                preventHeader: true,
                layout: {
                    type: 'accordion',
                    hideCollapseTool: true
                },
                listeners: {
                    expand: function (panel, eOpts) {

                    }
                },
                items: toolboxGrids
            });
            this.items.push(accordion);
        }

        // If the toolbar exists, move it into the editor rather than the top panel
        var tbar = null;
        if(this.tbar != null) {
            tbar = this.tbar;
            this.tbar = null;
        }

        // Create the panel to hold the Blockly editor
        var blocklyPanel = Ext.create('Ext.panel.Panel', {
            region: 'center',
            tbar: tbar,
            layout: 'fit',
            flex: 4,
            autoDestroy: true,
            listeners: {
                afterrender: function () {
                    renderBlockly();
                    Ext.fly(document.body).on('contextmenu', onContextMenu);
                    function onContextMenu(e, target) {
                        // don't show default context menu
                        e.preventDefault();
                    };
                },
                resize: function (panel, width, height, oldWidth, oldHeight, eOpts) {
                    Blockly.svgResize();
                },
                move: function (panel, x, y) {
                }
            }
        });
        this.items.push(blocklyPanel);

        this.callParent();

        function renderBlockly() {
            var blocklyId = blocklyPanel.getId() + "-body";
            // Initialise Blockly
            Blockly.inject(document.getElementById(blocklyId), {
                path: me.blockly.path,
                collapse: me.blockly.collapse,
                trashcan: me.blockly.trashcan
            });

            if (me.blockly.toolbox == true) {
                blocklyPanel.dropZone = Ext.create('Ext.dd.DropZone', Blockly.DIV, {
                    // If the mouse is over a target node, return that node.
                    getTargetFromEvent: function (e) {
                        console.log("node in");
                        //    var xx = win.getItems();
                        //win.fireEvent("mousemove", {clientX: e.xy[0], clientY: e.xy[1]});
                        //                    Blockly.fireUiEvent(document, 'mousemove');
                        //                    Blockly.onMouseMove_();
                        return e.getTarget("#" + blocklyId);
                    },
                    onNodeOver: function (target, dd, e, data) {
                        // While over a target node, return the default drop allowed class which
                        // places a "tick" icon into the drag proxy.
                        return Ext.dd.DropZone.prototype.dropAllowed;
                    },
                    onNodeDrop: function (target, dd, e, data) {
                        // On node drop, we can interrogate the target node to find the underlying
                        // application object that is the real target of the dragged data.
                        // We can use the data set up by the DragZone's getDragData method to read
                        // any data we decided to attach.
                        if (data.block == null)
                            return false;

                        var block = Blockly.Xml.textToDom(data.block);
                        Blockly.Xml.domToBlock(Blockly.getMainWorkspace(), block.childNodes[0]);
                        return true;
                    }
                });

                // Loop through all records in the toolbox and create the SVG graphic
                for (var i = 0; i < toolboxGrids.length; i++) {
                    toolboxGrids[i].store.each(function (record, id) {
                        var block = Blockly.Json.domToBlock(Blockly.getMainWorkspace(), record.get("block"));
                        if (block == null) {
                            console.log("Unable to load block '" + record.get("block") + "'.");
                        }
                        else {
//                            var block = Blockly.Json.domToBlock(Blockly.getMainWorkspace(), blockXml.childNodes[0]);

                            var svg = '<svg height="' + block.getHeightWidth().height + '" width="' + (block.getHeightWidth().width + 10) + '"><g transform=\"translate(10)\">' + block.getSvgRoot().outerHTML + "</g></svg>";
                            record.set('svg', svg);

                            Blockly.getMainWorkspace().clear();
                        }
                    }, me);
                }
            }

            // Load the design into the workspace
            if (me.blockly.blocks != null && me.blockly.blocks != "")
                me.setBlocks(me.blockly.blocks);

            // If a change listener is specified, add it
            if(me.blockly.listeners == null)
                return;

            if(me.blockly.listeners.workspacechanged) {
                var task = new Ext.util.DelayedTask(function(){
                    Ext.fly(Blockly.mainWorkspace.getCanvas()).on('blocklyWorkspaceChange',me.blockly.listeners.workspacechanged);
                });
                task.delay(500);
            }
        }
    },
    listeners: {
        beforedestroy: function(panel) {
            if(Blockly != null && Blockly.getMainWorkspace() != null)
                Blockly.getMainWorkspace().dispose();
            panel.removeAll(true);
        }
    },
    setBlocks: function (blocks) {
        // Clear any existing workspace
        if(Blockly.getMainWorkspace() != null)
            Blockly.getMainWorkspace().clear();

        Blockly.Json.setWorkspace(Blockly.getMainWorkspace(), blocks);
    },
    getBlocks: function (format, readable) {
        if(format == null || format.toLowerCase() == 'json')
            return Blockly.Json.getWorkspace(Blockly.getMainWorkspace());

        var xml = Blockly.Xml.workspaceToDom(Blockly.getMainWorkspace());
        if (readable == true)
            return Blockly.Xml.domToPrettyText(xml);
        else
            return Blockly.Xml.domToText(xml);
    }
});
