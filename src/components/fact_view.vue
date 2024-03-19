<template>
    <v-expansion-panels class="ma-3 text-blue">

        <!-- Graph -->
        <v-expansion-panel>
            <v-expansion-panel-title class="text-blue-darken-3"><h4>Visualization Type </h4></v-expansion-panel-title>
            <v-expansion-panel-text style="min-width: 500px">
                <v-switch v-model="has_attribute['graph']" label="Custom"/>
                <div class="d-flex">
                    <!-- Graph Type -->
                    <v-radio-group v-model="vis.graph" v-if="vis.type !== 'overall'"
                                   :disabled="!has_attribute['graph']">
                        <v-radio label="bar" value="bar" v-if="has_data()"></v-radio>
                        <v-radio label="pictograph" value="pictograph" v-if="has_data()"></v-radio>
                        <v-radio label="pie" value="pie" v-if="has_data() && vis.type === 'impact'"></v-radio>
                        <v-radio label="multiple pies" value="multiPie" v-if="has_data()"></v-radio>
                        <v-radio label="text" value="text"></v-radio>
                    </v-radio-group>

                    <!-- Unit & Context -->
                    <div class="w-50" v-if="get_default('unit') !== undefined && vis.graph !== 'pie'">
                        <b class="ml-2" v-if="has_attribute['graph']"> Unit & Context</b>
                        <div class="ml-2 text-grey" v-else>Unit & Context</div>
                        <v-radio-group v-model="vis.unit"
                                       :disabled="!has_attribute['graph']">
                            <v-radio label="absolute values" value="absolute"></v-radio>
                            <v-radio label="natural frequencies" value="natural_frequencies"></v-radio>
                            <v-radio label="percent" value="percent"></v-radio>
                        </v-radio-group>
                        <v-checkbox v-model="vis.context" label="Context"
                                    v-if="vis.graph === 'bar' || vis.graph === 'pictograph' || vis.graph === 'multiPie'"
                                    :disabled="!has_attribute['graph']" hide-details >
                        </v-checkbox>
                        <v-checkbox v-model="vis.flip" label="Flip"
                                    :disabled="!has_attribute['graph']" hide-details>
                        </v-checkbox>
                    </div>
                </div>

                <!-- Size -->
                <h4 v-if="has_attribute['graph']">Size</h4>
                <div class="ml-2 text-grey" v-else>Size</div>
                <v-slider v-model="vis.size" :disabled="!has_attribute['graph']"
                          min="0.7" max="1" append-icon="mdi-plus" prepend-icon="mdi-minus" thumb-label>
                    <template v-slot:thumb-label="{ modelValue }">
                        {{ (modelValue).toFixed(2) }}
                    </template>
                </v-slider>

                <!-- Graph type specific options -->
                <div class="w-100" :disabled="!has_attribute['graph']">

                    <div class="d-flex justify-space-start w-100 px-5">
                        <!-- grid -->
                        <div v-if="get('graph') === 'pictograph' || get('unit') === 'natural_frequencies' && get('graph') !== 'pie'">
                            <div class="mb-2 flex-grow-0" v-if="has_attribute['graph']"><b>Grid</b></div>
                            <div class="ml-2 text-grey" v-else>Grid</div>

                            <v-text-field v-if="vis.grid !== undefined" :disabled="!has_attribute['graph']"
                                    type="number" label="#rows" style="min-width:200px"
                                    v-model="vis.grid[0]"/>
                            <v-text-field v-else
                                    type="number" label="#rows" style="min-width:200px"/>
                            <v-text-field v-if="vis.grid !== undefined" :disabled="!has_attribute['graph']"
                                    type="number" label="#columns" style="min-width:200px"
                                    v-model="vis.grid[1]"/>
                            <v-text-field v-else
                                    type="number" label="#columns" style="min-width:200px"/>
                        </div>
                        <v-divider :disabled="vis.graph === 'pictograph' ||vis.unit === 'natural_frequencies' && vis.graph !== 'pie'" vertical class="mx-5"></v-divider>

                        <!-- Font size -->
                        <div v-if="get('graph') === 'text'" :disabled="!has_attribute['graph']" class="flex-grow-1">
                            <h4 v-if="has_attribute['graph']">Font Size</h4>
                            <div class="ml-2 text-grey" v-else>Font Size</div>
                            <v-slider v-model="vis.font_size" :disabled="!has_attribute['graph']"
                                      min="0.5" max="3" step="0.1" show-ticks="always"
                                      :ticks="[0.5,1,1.5,2,2.5,3]"></v-slider>
                        </div>

                        <!-- pie labels -->
                        <div v-if="get('graph') === 'pie'" class="flex flex-grow-1" :disabled="!has_attribute['graph']">
                            <h4 v-if="!has_attribute['graph']">Pie Labels</h4>
                            <div class="ml-2 text-grey" v-else>Pie Labels</div>
                            <v-radio-group v-model="vis.pie_labels" :disabled="!has_attribute['graph']">
                                <v-radio label="inside" value="inside"></v-radio>
                                <v-radio label="outside" value="outside"></v-radio>
                                <v-radio label="both" value="both"></v-radio>
                            </v-radio-group>
                        </div>

                        <!-- pictograph icons -->
                        <div v-if="get('graph') === 'pictograph'">
                            <h4 v-if="!has_attribute['graph']"> Pictograph </h4>
                            <div class="ml-2 text-grey" v-else>Pictograph</div>

                            <div class="d-flex mt-2">
                                <v-text-field v-model="vis.icon"
                                              placeholder="custom"
                                              style="min-width:250px"
                                              :prepend-icon="'mdi-' + vis.icon"
                                              append-inner-icon="mdi-pencil">
                                    <template v-slot:details>
                                        <div>
                                            see <a
                                                href="https://pictogrammers.com/library/mdi/"
                                                target="_blank">here</a> for more icons
                                        </div>
                                    </template>
                                </v-text-field>
                            </div>


                            <div class=" mt-2">presets:</div>
                            <v-btn-toggle v-model="vis.icon" inline class="mb-5" :disabled="!has_attribute['graph']">
                                <v-btn v-for="icon in icons" v-bind:key="icon"
                                       :value="icon">
                                    <v-icon :icon="'mdi-'+icon"/>
                                </v-btn>
                            </v-btn-toggle>

                                                      <div class="d-flex mt-2">
                                <v-text-field v-model="vis.icon2"
                                              placeholder="custom"
                                              style="min-width:250px"
                                              :prepend-icon="'mdi-' + vis.icon2"
                                              append-inner-icon="mdi-pencil">
                                    <template v-slot:details>
                                        <div>
                                            see <a
                                                href="https://pictogrammers.com/library/mdi/"
                                                target="_blank">here</a> for more icons
                                        </div>
                                    </template>
                                </v-text-field>
                            </div>


                            <div class=" mt-2">presets:</div>
                            <v-btn-toggle v-model="vis.icon2" inline class="mb-5" :disabled="!has_attribute['graph']">
                                <v-btn v-for="icon in icons" v-bind:key="icon"
                                       :value="icon">
                                    <v-icon :icon="'mdi-'+icon"/>
                                </v-btn>
                            </v-btn-toggle>

                            <v-slider v-model="vis.ratio" min="0" max="2" :disabled="!has_attribute['graph']"
                                      step="0.01" label="ratio" thumb-label></v-slider>

                        </div>
                    </div>
                </div>

                <v-btn @click="set_default_graph_settings" variant="tonal"
                       :disabled="!has_attribute['graph']">
                    set as default for {{ vis.type }}
                    facts
                </v-btn>
            </v-expansion-panel-text>
        </v-expansion-panel>

        <!-- Background Color -->
        <v-expansion-panel v-if="get_default('background') !== undefined">
            <v-expansion-panel-title class="text-blue-darken-3"><h4>Background Color </h4></v-expansion-panel-title>
            <v-expansion-panel-text style="min-width: 500px">
                <div class="d-flex">
                    <div>
                        <v-switch v-model="has_attribute['background']" label="Custom"/>

                        <div v-if="has_attribute['background']"  class="mb-5">
                            <v-icon :style="'color:' + vis.background.color">mdi-circle</v-icon>
                            <color-dialog :color="vis.background.color"
                                          @update="vis.background.color = $event;"></color-dialog>
                            <v-icon class="ml-2">mdi-pencil</v-icon>

                        </div>

                        <v-btn @click="makeDefault('bgcolor')" variant="tonal"
                               :disabled="!has_attribute['bgcolor']"> set as default for
                            {{ vis.type }} facts
                        </v-btn>
                    </div>
                </div>
            </v-expansion-panel-text>
        </v-expansion-panel>

        <!-- Title -->
        <v-expansion-panel v-if="get_default('title') !== undefined">
            <v-expansion-panel-title class="text-blue-darken-3"><h4>Title </h4></v-expansion-panel-title>
            <v-expansion-panel-text style="min-width: 500px">
                <v-switch v-model="has_attribute['title']" label="Custom"/>
                <text_input :text="vis.title" :default="get_default('title')"
                            @change="vis.title = $event" :color="get_bgcolor()"
                            :disabled="!has_attribute['title']"/>
                <v-btn @click="makeDefault('title')" :disabled="!has_attribute['title']"
                       variant="tonal">
                    set as default for {{ vis.type }} facts
                </v-btn>
            </v-expansion-panel-text>
        </v-expansion-panel>

        <!-- Axis -->
        <v-expansion-panel v-if="get_default('axis') !== undefined & !get('flip')">
            <v-expansion-panel-title class="text-blue-darken-3"><h4>X Axis </h4></v-expansion-panel-title>
            <v-expansion-panel-text style="min-width: 500px">
                <v-switch v-model="has_attribute['axis']" label="Custom"/>
                <text_input :text="vis.axis" :default="get_default('axis')"
                            @change="vis.axis = $event" :color="get_bgcolor()"
                            :disabled="!has_attribute['axis']"/>
                <v-btn @click="makeDefault('axis')" :disabled="!has_attribute['axis']"
                       variant="tonal">
                    set as default for {{ vis.type }} facts
                </v-btn>
            </v-expansion-panel-text>
        </v-expansion-panel>

        <!-- y Axis -->
        <v-expansion-panel v-if="get_default('yaxis') !== undefined & !get('flip')">
            <v-expansion-panel-title class="text-blue-darken-3"><h4>Y Axis </h4></v-expansion-panel-title>
            <v-expansion-panel-text style="min-width: 500px">
                <v-switch v-model="has_attribute['yaxis']" label="Custom"/>
                <text_input :text="vis.yaxis" :default="get_default('yaxis')"
                            @change="vis.yaxis = $event" :color="get_bgcolor()"
                            :disabled="!has_attribute['yaxis']"/>
                <v-btn @click="makeDefault('yaxis')" :disabled="!has_attribute['yaxis']"
                       variant="tonal">
                    set as default for {{ vis.type }} facts
                </v-btn>
            </v-expansion-panel-text>
        </v-expansion-panel>

        <!-- Annotation -->
        <v-expansion-panel v-if="annotation_list.length !== 0">
            <v-expansion-panel-title class="text-blue-darken-3"><h4>Annotation </h4></v-expansion-panel-title>
            <v-expansion-panel-text style="min-width: 500px">
                <v-switch v-model="has_attribute['annotation']" label="Custom"/>
                <v-radio-group v-model="vis.annotation" :disabled="!has_attribute['annotation']">
                    <v-radio label="no annotation" value="None"></v-radio>
                    <v-radio
                            v-for="el in annotation_list"
                            v-bind:key="el"
                            :value="el">
                        <template v-slot:label>
                            <div class="w-100">
                                <span v-for="span in helperStore.parse_text(el.text, dashboardStore.current_fact_group.column)"
                                      v-bind:key="span" :style="'color:' + span.color">
                                    {{ span.text }}
                                </span>
                            </div>
                        </template>
                    </v-radio>
                </v-radio-group>
                <div v-if="vis.annotation !== undefined && vis.annotation !== 'None' &&
                                    vis.annotation !== null">
                    <text_input :text="vis.annotation.text"
                                @change="vis.annotation.text = $event"
                                :color="get_bgcolor()"/>
                </div>
            </v-expansion-panel-text>
        </v-expansion-panel>

        <!-- Text -->
        <v-expansion-panel v-if="get_default('graph') === 'text' || vis.graph === 'text'">
            <v-expansion-panel-title class="text-blue-darken-3"><h4>Text </h4></v-expansion-panel-title>
            <v-expansion-panel-text style="min-width: 500px">
                <v-switch v-model="has_attribute['text']" label="Custom"/>
                <text_input :text="vis.text" :default="[]"
                            @change="vis.text = $event" :color="dashboardStore.default_colors[dashboardStore.intention].text"
                            :disabled="!has_attribute['text']"/>
                <v-btn @click="makeDefault('text')" :disabled="!has_attribute['text']"
                       variant="tonal">
                    set as default for {{ vis.type }} facts
                </v-btn>
            </v-expansion-panel-text>
        </v-expansion-panel>

    </v-expansion-panels>
</template>

<script>
import {useDashboardStore} from "@/stores/dashboardStore";
import text_input from "@/components/helpers/text-input.vue";
import {useDataStore} from "@/stores/dataStore";
import ColorDialog from "@/components/helpers/color-dialog.vue";
import {useAnnotationStore} from "@/stores/annotationStore";
import {useHelperStore} from "@/stores/helperStore";
import {useVisHelperStore} from "@/stores/visHelperStore";

export default {
    name: "fact_view",
    components: {ColorDialog, text_input},
    setup() {
        const dashboardStore = useDashboardStore()
        const dataStore = useDataStore()
        const annotationStore = useAnnotationStore()
        const helperStore = useHelperStore()
        const visHelperStore = useVisHelperStore()
        return {dashboardStore, dataStore, annotationStore, helperStore, visHelperStore}
    },
    data() {
        return {
            display: true,
            custom_bgcolor: '#000000',
            has_attribute: {},
            icons: ['circle', 'human-male', 'account', "emoticon", "emoticon-confused", 'bed', 'home'],
            annotation_list: []
        }
    },
    watch: {
        /**
         * watches display to close the view
         */
        display: function () {
            this.close()
        },
        /**
         * watches the has_attribute list to switch between default and custom values
         */
        has_attribute: {
            handler: function (val) {
                Object.keys(val).forEach(attr => {
                    if (val[attr]) {
                        if (this.vis[attr] === undefined) {
                            // when the attribute is not defined, set it to the default value
                            this.vis[attr] = JSON.parse(JSON.stringify(this.get_default(attr)))
                            if (attr === "graph") {
                                this.vis["unit"] = this.get_default("unit")
                                this.vis["context"] = this.get_default("context")
                                this.vis["flip"] = this.get_default("flip")
                                if (this.has_data() || this.vis.type==="overall") {
                                    this.vis["grid"] = JSON.parse(JSON.stringify(this.get_default("grid")))
                                    this.vis["icon"] = this.get_default("icon")
                                    this.vis["icon2"] = this.get_default("icon2")
                                    this.vis["ratio"] = this.get_default("ratio")
                                    this.vis["pie_labels"] = this.get_default("pie_labels")
                                    this.vis["font_size"] = this.get_default("font_size")
                                }

                                this.vis["size"] = this.get_default("size")
                            }

                            if (attr === "text") {
                                let exp = this.dashboardStore.current_fact_group_exports[this.dashboardStore.current_fact_index]
                                if (exp.type === "text") {
                                    this.vis["text"] = exp.item
                                }
                            }

                        }
                    } else {
                        this.vis[attr] = undefined
                        if (attr === "graph") {
                            ['font_size', 'grid', 'icon', 'icon2', 'ratio', 'graph', 'unit', 'context', 'flip', 'size', 'pie_labels'].forEach(key => {
                                this.vis[key] = undefined
                            })
                        }
                    }
                })
            },
            deep: true
        },
        /**
         * watches the vis object to update the view
         */
        vis: {
            handler: function (val) {
                if (val !== null) {
                    this.updateView()
                }
            },
            deep: true

        }
    },
    computed: {
        /**
         * current visualization
         * @returns {*|null}
         */
        vis() {
            if (this.dashboardStore.current_fact_index === null) {
                return null
            } else {
                return this.dashboardStore.current_fact_group.visList[this.dashboardStore.current_fact_index]
            }

        },
    },
    created() {
        if (this.dashboardStore.current_fact_index !== null) {
            this.updateView()
        }
    },
    methods: {
        /**
         * updates the view
         */
        updateView() {
            if (this.vis !== null && this.vis !== undefined) {
                let attributes = ["graph", "background", "title", "axis", "yaxis", "annotation", "text"]
                attributes.forEach(key => {
                    this.has_attribute[key] = this.vis[key] !== undefined
                })
                let unit = (this.vis.unit === undefined) ? this.get_default("unit") : this.vis.unit
                let grid = (this.vis.grid === undefined) ? this.get_default("grid") : this.vis.grid
                this.annotation_list = this.annotationStore.compute_annotations(this.dashboardStore.current_fact_group.column, this.vis.type, unit, grid, this.vis.data)
            }
        },
        /**
         * closes the fact view
         */
        close() {
            this.dashboardStore.current_fact_index = null
        },
        /**
         * sets the current attribute as default title for the current visualization type
         */
        makeDefault(attribute) {
            if (this.vis[attribute] !== undefined) {
                this.dashboardStore.default_settings[this.vis.type][attribute] = this.vis[attribute]
            }
            this.vis[attribute] = undefined
            this.has_attribute[attribute] = false
        },
        /**
         * gets the default value for the given attribute
         *
         * @param attribute
         * @returns {*|null}
         */
        get_default(attribute) {
            if (attribute === "annotation") {
                return this.annotation_list[0]
            }

            if (this.vis === null || this.vis === undefined) {
                return null
            }

            if (attribute === "background") {
                let bg = this.dashboardStore.default_colors[this.dashboardStore.intention].background
                //calculates foreground colors
                let color = this.visHelperStore.create_color_list(this.dashboardStore.current_fact_group.column.color,
                        this.dashboardStore.default_colors[this.dashboardStore.intention].colors,
                        this.dashboardStore.current_fact_group.column.options)
                //calculates background out of foreground, default background and index
                return {color: this.visHelperStore.get_bgcolor(bg.color, color, this.get_default("bgcolor")),
                    stroke: "None"}
            }

            return this.dashboardStore.default_settings[this.vis.type][attribute]
        },
        /**
         * gets the value of the given attribute
         *
         * @param attribute
         * @returns {*}
         */
        get(attribute) {
            let val = this.vis[attribute]
            if (val === undefined) {
                return this.get_default(attribute)
            } else {
                return val
            }
        },
        /**
         * sets the default graph settings for the current type
         */
        set_default_graph_settings() {
            if (this.vis.graph === 'text') {
                this.makeDefault('font_size')
            }

            if (this.vis.graph === 'pictograph') {
                this.makeDefault('grid')
                this.makeDefault('icon')
                this.makeDefault('icon2')
                this.makeDefault('ratio')
            }
            if (this.vis.graph === 'pie') {
                this.makeDefault('pie_labels')
            }
            this.makeDefault('graph')
            this.makeDefault('unit')
            this.makeDefault('context')
            this.makeDefault('flip')
            this.makeDefault('size')
            this.makeDefault('yaxis')
        },
        /**
         * returns the color of the current visualization
         * @returns {string}
         */
        get_bgcolor() {
            if (this.vis.bgcolor) {
                return this.dashboardStore.get_color(this.vis.bgcolor)
            } else {
                return this.dashboardStore.get_color(this.dashboardStore.default_settings[this.vis.type].bgcolor)
            }
        },
        /**
         * returns true when there is data associated with the current visualization
         *
         * @returns {string|*|null}
         */
        has_data() {
            return this.vis.data || this.vis.data_map || this.get_default("data") || this.get_default("data_map")
        }
    }
}
</script>

<style scoped>

</style>