<template>
    <v-dialog scrollable v-model="display" height="100%" width="90%">
        <v-card class="mx-auto w-100 h-100">

            <v-card-title>
                Fact Group View: {{ dashboardStore.current_fact_group.column['label'] }}

                <div v-if="column.riskIncrease">
                    Risk group:
                    {{ column.riskIncrease.name }}
                     <v-btn @click="panels = ['groups']" variant="text" class="ml-3 mb-1" prepend-icon="mdi-pencil" >change</v-btn>
                </div>
            </v-card-title>

            <!-- hints -->
            <div v-if="column.significance !== undefined &&
                column['significance'].significant_tuples.length === 0">
                <v-icon icon="mdi-alert"/>
                not statistically significant
            </div>
            <div v-if=" dashboardStore.is_recommendation_column(column) &&
                column.significance !== undefined &&
                column['significance'].score['regression'] < 0.001">
                <v-icon icon="mdi-alert"/>
                Adding this factor will not improve risk prediction further.
            </div>
            <div v-if="column.occurrence !== undefined && current_fact_group.visList.find(vis => vis.type === 'significance') &&
                Object.values(column.occurrence).filter( b => b < 100).length > 0">
                <v-icon icon="mdi-alert"/>
                Calculated frequencies are less accurate for options with less than 100 rows.
            </div>
            <div v-if="dashboardStore.current_fact_group.similar_dashboard_columns !== undefined &&
                dashboardStore.current_fact_group.similar_dashboard_columns.length > 0">
                <v-icon icon="mdi-alert"/>
                Correlates strongly with dashboard items:
                {{
                dashboardStore.current_fact_group.similar_dashboard_columns
                    .map(d => d.column.label + " (" + d.similarity.toFixed(1) + ")")
                    .join(", ")
                }}
            </div>

            <div class="d-flex justify-end">

                <!-- visualizations -->
                <div class="justify-center flex-grow-1">
                    <div class="d-flex flex-column pb-5">
                        <div class="d-flex justify-space-between mx-2 align-center">
                            <div class="text-grey-darken-2">Click to select</div>
                            <v-btn class="text-blue-darken-3" variant="text"
                                   @click="dashboardStore.current_fact_index = null">clear
                                selection
                            </v-btn>
                        </div>
                        <div class="d-flex flex-column pa-1 ma-auto"
                             v-for="(vis,i) in dashboardStore.current_fact_group.visList"
                             v-bind:key="vis">
                            <v-hover v-slot="{ isHovering, props }">
                                <v-card :elevation="isHovering ? 16 : 2" v-bind="props" @click="toggle_fact_view(i)"
                                        :class="[{ 'on-hover': isHovering },
                                        {'bg-blue-darken-3': dashboardStore.current_fact_index === i}]"
                                        class="pa-2">
                                    <div class="bg-white pt-3">
                                        <vis_parser :vis="vis" :column="dashboardStore.current_fact_group.column"
                                                    :width="vis_width" :index="i"/>
                                    </div>
                                    <div class="d-flex align-center mx-5"
                                         v-if="dashboardStore.current_fact_index === i">
                                        <span>{{vis.type.toString().toUpperCase()}} </span>
                                        <span class="d-flex justify-center align-center flex-grow-1 mr-10">
                                            <v-btn variant="text" icon="mdi-arrow-up" @click="move_vis_up(i)"></v-btn>
                                            <v-btn variant="text" icon="mdi-arrow-down" @click="move_vis_down(i)"></v-btn>
                                            <v-btn variant="text" @click="remove_vis(i)">remove</v-btn>
                                            <v-btn variant="text" @click="copy_vis(i)">copy</v-btn>
                                            <v-btn variant="text" @click="export_vis_as_png(i)">export</v-btn>
                                        </span>
                                    </div>
                                </v-card>
                            </v-hover>
                        </div>
                    </div>
                </div>

                <!-- settings -->
                <div class="w-50  pr-5">
                    <!-- general tabs -->
                    <h3 class="ml-3 mt-5"> General </h3>
                    <v-text-field label="Label" class="ml-3 mt-2"
                                  v-model="column.label"
                                  append-inner-icon="mdi-pencil"/>
                    <v-expansion-panels class="mx-3 mb-3" v-model="panels">

                        <!-- statistical information -->
                        <v-expansion-panel v-if="column.significance !== undefined" @click="calculate_similar_facts()" value="statistics">
                            <v-expansion-panel-title><h4> Statistical Information </h4></v-expansion-panel-title>
                            <v-expansion-panel-text class="text-grey-darken-2" style="min-width: 500px">
                                <!-- risk factor? -->
                                <div v-if="current_fact_group.visList.find(vis => vis.type === 'significance')">
                                    <div v-if="column.riskIncrease !== undefined" class="mb-5">
                                        <b>Risk Group(s): </b>
                                        <v-chip v-for="group in column.riskIncrease.risk_factor_groups" :key="group" class="mr-2" outlined>
                                            {{group}}
                                        </v-chip>
                                        <v-btn @click="panels = ['groups']" variant="text" class="ml-3 mb-1" prepend-icon="mdi-pencil" >change</v-btn> <br>

                                        Prevalence Odds Ratio: {{column.riskIncrease.odds_ratio}} <br>
                                        Relative Risk: {{column.riskIncrease.relative_risk}}
                                    </div>

                                    <div v-if="column.significance && !dashboardStore.dashboard_items.find(d => d.name === column.name)">
                                        improves model despite selected interaction terms:
                                        {{
                                        column['significance'].score['regression'] > 0 ? "yes" : "no"
                                        }}
                                    </div>
                                    <div v-if="column.significance && dashboardStore.dashboard_items.find(d => d.name === column.name)">
                                        model influence strength:
                                        {{column['significance'].score['regression'].toFixed(2)}}
                                    </div>

                                    <div v-if="column.correlation_with_target" class="mt-5"> Correlation with Target:
                                        {{ column['correlation_with_target'].toFixed(2) }}
                                    </div>
                                </div>

                                <!-- similar columns -->
                                <div class="mt-5">
                                    <b>Correlates strongly with:</b>
                                </div>
                                <div class="d-flex overflow-y-hidden  pb-5">
                                    <div class="d-flex flex-column pa-1"
                                         v-for="item in dashboardStore.current_fact_group.similar_columns"
                                         v-bind:key="item">
                                        <fact_group_preview style="height:400px" class="pa-2" :visList="item.visList"
                                                            :column="item.column" :vertical="true"/>
                                        <div class="d-flex pl-2 align-self-center">Correlation:
                                            {{ item.similarity.toFixed(2) }}
                                        </div>
                                    </div>
                                    <div v-if="current_fact_group.similar_columns === undefined || current_fact_group.similar_columns.length === 0"
                                         class="d-flex align-center justify-center flex-grow-1">
                                        No similar columns found.
                                    </div>
                                </div>
                            </v-expansion-panel-text>
                        </v-expansion-panel>

                        <!-- groups -->
                        <v-expansion-panel value="groups">
                            <v-expansion-panel-title><h4> Groups/ Bins </h4></v-expansion-panel-title>
                            <v-expansion-panel-text style="min-width: 500px">
                                <div class="d-flex w-100">
                                    <div class="bg-grey-darken-2 mb-2 rounded-pill" style="width:10px"></div>
                                    <div class="flex-grow-1">
                                        <div v-for="(item,i) in dashboardStore.current_fact_group.column.options"
                                             v-bind:key="i">
                                            <div class="d-flex">
                                                <div class="bg-grey-darken-2 rounded-e-pill mt-4 mr-2"
                                                     style="width:10px; height:20px"></div>
                                                <v-btn @click="add_step(i)" class="mt-3 mx-5"
                                                       v-if="item.range !== undefined"
                                                       variant="text" icon="mdi-plus-box" hint="hi"
                                                       density="compact">
                                                    <v-icon>mdi-plus-box</v-icon>
                                                    <v-tooltip activator="parent" location="start">Add Group in
                                                        between
                                                    </v-tooltip>
                                                </v-btn>
                                                <v-text-field variant="underlined" class="mx-2" density="compact"
                                                              :label="column.type === 'categorical' ? item.name : ''"
                                                              :class="column.type === 'continuous' ? 'text-grey-darken-1' : ''"
                                                              hint="group label"
                                                              v-model="dashboardStore.current_fact_group.column.options[i].label"/>
                                                <div v-if="column.type === 'categorical'">
                                                    <v-btn @click="move_group_up(i)" icon="mdi-arrow-up" variant="flat"
                                                           density="compact"/>
                                                    <v-btn @click="move_group_down(i)" icon="mdi-arrow-down"
                                                           variant="flat" density="compact"/>
                                                </div>
                                                <div class="d-flex align-start" density="compact">
                                                    <span class="mt-3 ml-5 mr-1"> Risk group </span>
                                                    <v-checkbox class="mt-1" v-model="item.risk_group"
                                                                density="compact"/>
                                                </div>

                                            </div>
                                            <div class="d-flex justify-start" v-if="option_steps[i] !== undefined">
                                                <v-text-field type="number" style="max-width: 100px" class="mx-2"
                                                              density="compact" variant="outlined" hide-details
                                                              v-model="option_steps[i]" @change="update_step(i)"/>
                                                <v-btn @click="remove_step(i)" variant="text" density="compact"
                                                       class="mt-1"
                                                       icon="mdi-delete">
                                                    <v-icon>mdi-delete</v-icon>
                                                    <v-tooltip activator="parent" location="end">Merge Groups
                                                    </v-tooltip>
                                                </v-btn>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </v-expansion-panel-text>
                        </v-expansion-panel>

                        <!-- colors -->
                        <v-expansion-panel value="colors">
                            <v-expansion-panel-title><h4> Colors </h4></v-expansion-panel-title>
                            <v-expansion-panel-text style="min-width: 500px">
                                <v-switch v-model="customColors" label="Custom"/>
                                <div v-if="column.color.list !== undefined && column.color.type === 'custom'" >
                                    <span  v-for="(color,i) in column.color.list" :key="i" class="mx-3">
                                            {{column.options[i].label}}
                                            <v-icon :style="'color:' + color">mdi-circle</v-icon>
                                            <v-icon class="mr-2">mdi-pencil</v-icon>
                                            <color-dialog :color="color"
                                                          @update="column.color.list[i] = $event; color=$event"></color-dialog>
                                    </span>
                                </div>

                            </v-expansion-panel-text>
                        </v-expansion-panel>

                        <!-- additional visualizations -->
                        <v-expansion-panel value="visualizations">
                            <v-expansion-panel-title><h4> Additional Visualizations </h4></v-expansion-panel-title>
                            <v-expansion-panel-text style="min-width: 500px">
                                <div class="d-flex overflow-y-hidden  pb-5">
                                    <div class="d-flex flex-column pa-1"
                                         v-for="vis in dashboardStore.current_fact_group.additional_vis_list"
                                         v-bind:key="vis">
                                        <v-hover v-slot="{ isHovering, props }">
                                            <v-card :elevation="isHovering ? 16 : 2" v-bind="props"
                                                    @click="add_vis(vis)"
                                                    :class="{ 'on-hover': isHovering }" class="pa-2">
                                                <vis_parser :vis="vis"
                                                            :column="dashboardStore.current_fact_group.column"
                                                            :width="300"
                                                            :preview="true"/>
                                            </v-card>
                                        </v-hover>
                                        <div class="d-flex w-100 flex-wrap">
                                            <v-btn variant="tonal" class="flex-grow-1 mx-1" @click="add_vis(vis)">Add
                                            </v-btn>
                                        </div>
                                    </div>
                                </div>
                            </v-expansion-panel-text>
                        </v-expansion-panel>
                    </v-expansion-panels>
                    <!-- individual vis tabs -->
                    <h3 class="ml-3 text-blue-darken-3" v-if="dashboardStore.current_fact_index !== null">
                        Selected </h3>
                    <fact_view v-if="this.dashboardStore.current_fact_index !== null"/>
                </div>

            </div>

            <!-- buttons -->
            <div class="d-flex flex-column-reverse h-100">
                <v-card-actions class="w-100 bg-grey-lighten-2 pa-5">
                    <div class="d-flex w-100 ">
                        <v-btn variant="elevated" @click="close" class="px-9">Close</v-btn>
                        <v-btn variant="elevated" @click="add" prepend-icon="mdi-plus-thick"
                               class="font-weight-bold px-5"
                               v-if="!dashboardStore.dashboard_items.find(d => d.name === dashboardStore.current_fact_group.column.name)">
                            Add to dashboard
                        </v-btn>
                        <v-btn variant="elevated" @click="remove" prepend-icon="mdi-minus-thick"
                               class="font-weight-bold px-5" v-else> Remove from
                            dashboard
                        </v-btn>
                        <v-btn variant="elevated" @click="pdfExport" prepend-icon="mdi-export-variant"> Export PDF
                        </v-btn>
                        <!-- end buttons -->
                        <div class="flex-grow-1 d-flex justify-end" v-if="current_fact_group.visList.find(vis => vis.type === 'significance')">
                            <v-btn variant="text" @click="exclude" prepend-icon="mdi-delete"
                                   v-if="!dashboardStore.excluded_columns.includes(column.name) && !dashboardStore.dashboard_items.find(d => d.name === column.name)">
                                Exclude
                            </v-btn>
                        </div>
                    </div>
                </v-card-actions>
            </div>


        </v-card>
    </v-dialog>
</template>

<script>
import fact_view from "@/components/fact_view.vue";
import vis_parser from "@/components/visualization/vis_parser.vue";
import fact_group_preview from "@/components/fact_group_preview.vue";

import {useDashboardStore} from "@/stores/dashboardStore";
import {useDataStore} from "@/stores/dataStore";
import {useScoreStore} from "@/stores/scoreStore"
import {useSimilarityStore} from "@/stores/similarityStore";
import {useHelperStore} from "@/stores/helperStore";
import {useVisHelperStore} from "@/stores/visHelperStore";
import * as d3 from "d3";

import * as svg2png from "save-svg-as-png/lib/saveSvgAsPng.js";
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import pdfMake from "pdfmake/build/pdfmake";
import ColorDialog from "@/components/helpers/color-dialog.vue";

pdfMake.vfs = pdfFonts && pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : globalThis.pdfMake.vfs;

export default {
    name: "fact_group_view",
    components: {ColorDialog, vis_parser, fact_group_preview, fact_view},
    setup() {
        const dashboardStore = useDashboardStore()
        const dataStore = useDataStore()
        const scoreStore = useScoreStore()
        const similarityStore = useSimilarityStore()
        const helperStore = useHelperStore()
        const visHelperStore = useVisHelperStore()
        return {dashboardStore, dataStore, scoreStore, similarityStore, helperStore, visHelperStore}
    },
    data() {
        return {
            display: true,
            panels: [],
            option_steps: [],
            exportOptions: {
                backgroundColor: "white",
                encoderOptions: 1,
                scale: 2,
            },
            vis_width: 700,
            customColors: false
        }
    },
    created() {
        this.options_to_steps()
        this.customColors = this.column.color.type === "custom"
    },
    watch: {
        display: function () {
            this.close()
        },
        current_fact_group: function () {
            this.panels = []
        },
        risk_groups: function () {
            if (this.column) {
                this.dataStore.compute_risk_increase(this.column)
            }
        },
        customColors: function () {
            if (this.customColors) {
                this.column.color.list = this.visHelperStore.create_color_list(this.column.color,
                        this.dashboardStore.default_colors[this.dashboardStore.intention].colors,
                        this.column.options)
                this.column.color.type = "custom"
            }
            else {
                this.column.color.type = "standard"
            }
        }
    },
    computed: {
        current_fact_group() {
            return this.dashboardStore.current_fact_group
        },
        column() {
            if (this.dashboardStore.current_fact_group) {
                return this.dashboardStore.current_fact_group.column
            } else return null
        },
        risk_groups() {
            if (this.column && this.dashboardStore.current_fact_group.column.options) {
                return this.dashboardStore.current_fact_group.column.options.map(o => o.risk_group)
            } else return []

        }
    },
    methods: {
        /**
         * shows fact view for the selected fact
         *
         * @param i index of the fact
         */
        toggle_fact_view(i) {
            if (this.dashboardStore.current_fact_index === i) {
                this.dashboardStore.current_fact_index = null
            } else {
                this.dashboardStore.current_fact_index = i
            }
        },
        /**
         * closes the fact group view
         */
        close() {
            this.dashboardStore.current_fact_index = null
            this.dashboardStore.current_fact_group = null
            this.dashboardStore.current_fact_group_exports = []
            this.dashboardStore.update_dashboard_context()
        },
        /**
         * adds the fact group to the dashboard
         */
        add() {
            this.dashboardStore.add_dashboard_item(this.dashboardStore.current_fact_group.column, this.dashboardStore.current_fact_group.visList)
            this.close()
        },
        /**
         * excludes the fact group from the dashboard
         */
        remove() {
            this.dashboardStore.remove_dashboard_item(this.dashboardStore.current_fact_group.column.name)
            this.close()
        },
        /**
         * recalculates the options for the risk factor
         */
        recalculate_options() {
            this.dashboardStore.current_fact_group.column = this.dataStore.recalculate_column_after_option_change(this.dashboardStore.current_fact_group.column)
            this.calculate_similar_facts(true)
        },
        /**
         * moves visualization up in the fact group visList
         *
         * @param index
         */
        move_vis_up(index) {
            if (index > 0) {
                this.dashboardStore.current_fact_group.visList.splice(index - 1, 0, this.dashboardStore.current_fact_group.visList.splice(index, 1)[0])
                this.dashboardStore.current_fact_index = index
            }
        },
        /**
         * moves visualization down in the fact group visList
         *
         * @param index
         */
        move_vis_down(index) {
            if (index < this.dashboardStore.current_fact_group.visList.length - 1) {
                this.dashboardStore.current_fact_group.visList.splice(index + 1, 0, this.dashboardStore.current_fact_group.visList.splice(index, 1)[0])
                this.dashboardStore.current_fact_index = index
            }
        },
        /**
         * removes a visualization from the fact group visList
         *
         * @param index
         */
        remove_vis(index) {
            //current_index must not be set to null as toggle_fact_view is called and does it
            let removed = this.dashboardStore.current_fact_group.visList.splice(index, 1)
            this.dashboardStore.current_fact_group.additional_vis_list.push(removed[0])
        },
        /**
         * adds a visualization to the fact group visList
         *
         * @param vis
         */
        add_vis(vis) {
            this.dashboardStore.current_fact_group.additional_vis_list = this.dashboardStore.current_fact_group.additional_vis_list.filter(item => item.type !== vis.type)
            this.dashboardStore.current_fact_group.visList.push(vis)
            this.dashboardStore.current_fact_index = this.dashboardStore.current_fact_group.visList.length - 1
        },
        /**
         * deletes the fact group
         */
        exclude() {
            this.dashboardStore.exclude_column(this.dashboardStore.current_fact_group.column)
            this.close()
        },
        /**
         * includes the fact group
         */
        include() {
            this.dashboardStore.restore_column(this.dashboardStore.current_fact_group.column.name)
            this.close()
        },
        /**
         * calculates similar facts
         * @param always
         */
        calculate_similar_facts(always = false) {
            if (!this.dashboardStore.current_fact_group['similar_columns'] || always) {
                this.dashboardStore.current_fact_group['similar_columns'] = this.similarityStore.compute_similar_columns(this.column)
                this.dashboardStore.current_fact_group['similar_dashboard_columns'] = this.similarityStore.compute_similar_dashboard_columns(this.column)
            }
        },
        /**
         * creates steps from options (for easier editing of bins)
         */
        options_to_steps() {
            if (this.dashboardStore.current_fact_group.column.type === 'continuous') {
                let steps = this.dashboardStore.current_fact_group.column.options.filter(d => d.range !== undefined).map(d => d.range[1])
                steps.pop()
                this.option_steps = steps
            } else this.option_steps = []
        },
        /**
         * updates the option associated with a step
         *
         * @param i
         */
        update_step(i) {
            this.dashboardStore.current_fact_group.column.options[i].range[1] = this.option_steps[i]
            this.dashboardStore.current_fact_group.column.options[i + 1].range[0] = this.option_steps[i]
            this.recalculate_options()
        },
        /**
         * removes a step
         *
         * @param i
         */
        remove_step(i) {
            this.dashboardStore.current_fact_group.column.options[i + 1].range[0] = this.dashboardStore.current_fact_group.column.options[i].range[0]
            this.dashboardStore.current_fact_group.column.options.splice(i, 1)
            this.option_steps.splice(i, 1)
            this.recalculate_options()
        },
        /**
         * adds a step
         *
         * @param i
         */
        add_step(i) {
            let min = (i - 1) < 0 ? this.dashboardStore.current_fact_group.column.options[0].range[0] : this.option_steps[i - 1]
            let max = (i >= this.option_steps.length) ? d3.max(this.dashboardStore.current_fact_group.column.options.filter(d => d.range !== undefined).map(d => +d.range[1])) : this.option_steps[i]
            let new_step = +min + (+max - +min) / 2
            this.option_steps.splice(i, 0, new_step)
            this.dashboardStore.current_fact_group.column.options[i].range[0] = new_step
            this.dashboardStore.current_fact_group.column.options.splice(i, 0, {
                'name': min + '-' + new_step,
                'label': min + '-' + new_step,
                'range': [min, new_step]
            })
            this.recalculate_options()
        },
        /**
         * moves a group of a categorical variable up in the ordering
         * @param i
         */
        move_group_up(i) {
            let options = this.dashboardStore.current_fact_group.column.options
            if (i > 0) {
                options[i].index = i - 1
                options[i - 1].index = i
                options = options.sort(this.helperStore.sort)
            }
        },
        /**
         * moves a group of a categorical variable down in the ordering
         * @param i
         */
        move_group_down(i) {
            let options = this.dashboardStore.current_fact_group.column.options
            if (i < options.length - 1) {
                options[i].index = i + 1
                options[i + 1].index = i
                options = options.sort(this.helperStore.sort)
            }
        },
        /**
         * exports the current fact group as pdf
         */
        async pdfExport() {
            let data = {
                content: [{
                    text: this.column.label,
                    style: 'header'
                }],
                styles: {
                    header: {
                        fontSize: 20,
                        bold: true,
                        margin: [0, 0, 0, 10],
                        alignment: 'center'
                    },
                    text: {
                        fontSize: 14,
                        margin: [0, 0, 0, 10],
                        alignment: 'left'
                    }
                },
                pageOrientation: 'landscape',
            }

            for (let i = 0; i < this.dashboardStore.current_fact_group_exports.length; i++) {
                let exp = this.dashboardStore.current_fact_group_exports[i]
                if (exp.type === "svg") {
                    await svg2png.svgAsPngUri(exp.item, this.exportOptions).then(uri => {
                        data.content.push({
                            image: uri, width: exp.width * 0.7, margin: [0, 0, 0, 15]
                        })
                    })
                } else if (exp.type === "text") {
                    data.content.push({
                        text: this.helperStore.parse_text(exp.item, this.column).map(d => d.text).join(' '),
                        style: 'text',
                        margin: [0, 0, 0, 15]
                    })
                }
            }

            pdfMake.createPdf(data).open()

        },
        /**
         * copies the svg of the visualization as png to the clipboard
         * @param index
         */
        copy_vis(index) {
            let exp = this.dashboardStore.current_fact_group_exports[index]
            if (exp.type === "svg") {
                svg2png.svgAsPngUri(exp.item, this.exportOptions).then(uri => {
                    fetch(uri).then(r => r.blob().then(b => {
                        navigator.clipboard.write([
                            new ClipboardItem({
                                'image/png': b,
                            })
                        ])
                    }))
                })
            } else if (exp.type === "text") {
                navigator.clipboard.writeText(this.helperStore.parse_text(exp.item, this.column).map(d => d.text).join(' '))
            }

        },
        /**
         * exports the svg of the visualization as png
         *
         * @param index
         */
        export_vis_as_png(index) {
            let exp = this.dashboardStore.current_fact_group_exports[index]
            if (exp.type === "svg") {
                svg2png.saveSvgAsPng(exp.item, "vis.png", this.exportOptions)
            } else if (exp.type === "text") {
                let blob = new Blob([this.helperStore.parse_text(exp.item, this.column).map(d => d.text).join(' ')], {type: "text/plain;charset=utf-8"});
                saveAs(blob, "vis.txt");
            }
        }
    }
}
</script>

<style lang="sass" scoped>
.v-card.on-hover
  cursor: pointer

</style>