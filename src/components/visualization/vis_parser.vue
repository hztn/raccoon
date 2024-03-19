<template>
    <vis_bar v-if="graph === 'bar' & !flip" @svg="saveSVG"
             :vis="full_vis" :column="column" :width="width" :preview="preview" :key="rerender"/>
    <vis_bar_flip v-if="graph === 'bar' & flip" @svg="saveSVG"
             :vis="full_vis" :column="column" :width="width" :preview="preview" :key="rerender"/>
    <vis_pictograph v-if="graph === 'pictograph' & !flip" @svg="saveSVG"
                    :vis="full_vis" :column="column" :width="width" :preview="preview" :key="rerender"/>
    <vis_pictograph_flip v-if="graph === 'pictograph' & flip" @svg="saveSVG"
                    :vis="full_vis" :column="column" :width="width" :preview="preview" :key="rerender"/>
    <vis_text v-if="graph === 'text'" @text="saveText"
              :vis="full_vis" :column="column" :width="width" :preview="preview" :key="rerender"/>
    <vis_pie v-if="graph === 'pie' & !flip" @svg="saveSVG"
             :vis="full_vis" :column="column" :width="width" :preview="preview" :key="rerender"/>
    <vis_pie_flip v-if="graph === 'pie' & flip" @svg="saveSVG"
             :vis="full_vis" :column="column" :width="width" :preview="preview" :key="rerender"/>
    <vis_multiple_pie v-if="graph === 'multiPie' & !flip" @svg="saveSVG"
                      :vis="full_vis" :column="column" :width="width" :preview="preview" :key="rerender"/>
    <vis_multiple_pie_flip v-if="graph === 'multiPie' & flip" @svg="saveSVG"
                      :vis="full_vis" :column="column" :width="width" :preview="preview" :key="rerender"/>
</template>

<script>
import vis_pictograph from "@/components/visualization/vis_pictograph.vue";
import vis_bar from "@/components/visualization/vis_bar.vue";
import vis_text from "@/components/visualization/vis_text.vue";
import vis_pie from "@/components/visualization/vis_pie.vue";
import vis_pie_flip from "@/components/visualization/vis_pie_flip.vue";
import vis_pictograph_flip from "@/components/visualization/vis_pictograph_flip.vue";
import vis_bar_flip from "@/components/visualization/vis_bar_flip.vue";
import {useDashboardStore} from "@/stores/dashboardStore";
import {useDataStore} from "@/stores/dataStore";
import {useAnnotationStore} from "@/stores/annotationStore";
import vis_multiple_pie from "@/components/visualization/vis_multiple_pie.vue";
import vis_multiple_pie_flip from "@/components/visualization/vis_multiple_pie_flip.vue";
import {useHelperStore} from "@/stores/helperStore";
import {useVisHelperStore} from "@/stores/visHelperStore";
import * as d3 from "d3";

export default {
    name: "vis_parser",
    props: [
        "vis", "column", "width", "preview", "index"
    ],
    setup() {
        const dashboardStore = useDashboardStore()
        const dataStore = useDataStore()
        const annotationStore = useAnnotationStore()
        const helperStore = useHelperStore()
        const visHelperStore = useVisHelperStore()
        return {dashboardStore, dataStore, annotationStore, helperStore, visHelperStore}
    },
    components: {vis_bar, vis_pictograph, vis_text, vis_pie, vis_multiple_pie, vis_pictograph_flip, vis_bar_flip, vis_pie_flip, vis_multiple_pie_flip},
    data() {
        return {
            rerender: 0
        }
    },
    computed: {
        graph() {
            return this.vis.graph ? this.vis.graph : this.dashboardStore.default_settings[this.vis.type].graph
        },
        flip() {
            return this.vis.flip !== undefined ? this.vis.flip : this.dashboardStore.default_settings[this.vis.type].flip
        },
        target() {
            return this.dataStore.target_label
        },
        row_label() {
            return this.dataStore.row_label
        },
        /**
         * fills in missing attributes with default values and computes annotations
         *
         * @returns {*}
         */
        full_vis() {
            let vis = JSON.parse((JSON.stringify(this.vis)))
            let type_attr = ["title", "range", "grid", "axis", "yaxis", "unit", "context", "flip", "icon", "icon2", "ratio", "graph", "size", "pie_labels", "bgcolor"]
            type_attr.forEach(a => {
                if (vis[a] === null || vis[a] === undefined) {
                    vis[a] = this.dashboardStore.default_settings[vis.type][a]
                }
            })

            //range: sometimes for a specific column, there are fewer values than the default range
            if (vis.type === "impact" && vis.range !== "percent") {
                let max  = Object.values(this.column.occurrence).reduce((a, b) => a + b, 0)
                vis.range = [0,max]
            }


            //colors
            if (!vis["background"]) {
                if (this.dashboardStore.default_settings[vis.type]["background"] !== undefined) {
                    vis["background"] = this.dashboardStore.default_settings[vis.type]["background"]
                } else {
                    vis["background"] = this.dashboardStore.default_colors[this.dashboardStore.intention].background
                }
            }
            if (vis["color"] === null || vis["color"] === undefined) {
                if (vis.graph === "text") {
                    vis["color"] = this.dashboardStore.default_colors[this.dashboardStore.intention].text
                } else {
                    vis["color"] = this.visHelperStore.create_color_list(this.column.color,
                        this.dashboardStore.default_colors[this.dashboardStore.intention].colors,
                        this.column.options)
                }
            }


            //font
            if (!vis["font_family"]) {
                vis["font_family"] = this.dashboardStore.default_colors[this.dashboardStore.intention]["font_family"]
            }

            //annotations
            if (!this.preview && !vis["annotation"]) {
                let annotations = this.annotationStore.compute_annotations(this.column, vis.type, vis.unit, vis.grid, vis.data)
                if (annotations.length > 1) { //greater than 1 because of the custom annotation
                    vis["annotation"] = annotations[0]
                    vis["annotation"].text.forEach(t => {
                      t.color = t.color.replace("$color", vis.color)
                      t.color = t.color.replace("$text", this.dashboardStore.default_colors[this.dashboardStore.intention]["text"])
                    })
                } else {
                    vis["annotation"] = "None"
                }
            }

            vis = JSON.parse((JSON.stringify(vis))) //remove all possible direkt references to default settings

            let text_attr = ["text", "title", "axis", "yaxis"]
            text_attr.forEach(a => {
                if (vis[a]) {
                    vis[a] = vis[a].map(t => {
                        t.color = t.color.replace("$color", vis.color)
                        t.color = t.color.replace("$text", this.dashboardStore.default_colors[this.dashboardStore.intention]["text"])
                        return t
                    })
                }
            })

            if (vis["annotation"] && vis["annotation"] !== "None") {
                vis["annotation"] = this.wrap_text(vis["annotation"])
            }

            return vis
        }
    },
    watch: {
        column: {
            handler: function () {
                this.rerender++
            }
            ,
            deep: true
        },
        full_vis: {
            handler: function () {
                this.rerender++
            }
            ,
            deep: true
        },
        target: {
            handler: function () {
                this.rerender++
            }
            ,
            deep: true
        },
        row_label: {
            handler: function () {
                this.rerender++
            }
            ,
            deep: true
        }
    },
    methods: {
        /**
         * add line breaks to annotation text
         *
         * @param annotation
         * @returns {*}
         */
        wrap_text(annotation) {
            let MAX_LENGTH = this.flip? 50 : 25
            //parse text to get full labels instead of variables
            let all_elements = this.helperStore.parse_text(annotation.text, this.column)

            //create new lines
            let new_lines = []
            let current_line = []
            let current_line_length = 0
            all_elements.forEach(e => {
                //if tspan is too long, split up by word and try again
                if (current_line_length + e.text.length > MAX_LENGTH) {
                    //split up line
                    e.text.split(" ").forEach(s => {
                        if (current_line_length + s.length > MAX_LENGTH) {
                            new_lines.push(current_line)
                            current_line = [{text: s, color: e.color, weight: e.weight, italic: e.italic}]
                            current_line_length = s.length
                        } else {
                            current_line.push({text: " " + s, color: e.color, italic: e.italic})
                            current_line_length += s.length + 1
                        }
                    })
                }
                //if tspan is not too long, add to current line
                else {
                    current_line.push(e)
                    current_line_length += e.text.length
                }
            })
            new_lines.push(current_line)

            annotation.text = new_lines
            return annotation
        },
        /**
         * save svgs for export
         * @param svg
         * @param width
         */
        saveSVG(svg, width) {
            if (this.index !== undefined) {
                this.dashboardStore.current_fact_group_exports[this.index] = {type: "svg", item: svg, width: width}
            }
        },
        /**
         * save text for export
         * @param txt
         */
        saveText(txt) {
            if (this.index !== undefined) {
                this.dashboardStore.current_fact_group_exports[this.index] = {type: "text", item: txt}
            }
        }
    }
}
</script>

<style scoped>

</style>