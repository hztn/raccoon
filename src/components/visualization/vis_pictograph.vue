<template>
    <i v-show="false" class="mdi" :class="'mdi-' + this.vis.icon"/>
    <i v-show="false" class="mdi" :class="'mdi-' + this.vis.icon2"/>
    <div ref="container"/>
</template>

<script>
import * as d3 from "d3";
import {useHelperStore} from "@/stores/helperStore";
import {useDataStore} from "@/stores/dataStore";
import {useVisHelperStore} from "@/stores/visHelperStore";

export default {
    name: "vis_pictograph",
    props: [
        "column", "vis", "width", "preview"
    ],
    emits: ["svg"],
    setup() {
        const helperStore = useHelperStore()
        const dataStore = useDataStore()
        const visHelperStore = useVisHelperStore()
        return {helperStore, dataStore, visHelperStore}
    },
    data: function () {
        return {
            use_column_group_names: false,
            num_colors: 5
        }
    },
    methods: {
        /**
         * returns value in number of dots
         *
         * @param value
         * @returns {string}
         */
        get_value(value) {
            const nominator = (this.vis.range === "percent") ? value : (value / this.visHelperStore.get_range(this.vis)[1])
            return (nominator * this.vis.grid[0] * this.vis.grid[1]).toFixed(0)

        }
        ,

        /**
         * returns value as frequency with nominator/denominator
         *
         * @param value
         * @returns {[{color, text: string},{color: string, text: string}]}
         */
        get_value_text(value) {
            if (this.vis.unit === "natural_frequencies") {
                return [{"text": this.get_value(value), "color": this.vis.color},
                    {"text": "/" + this.vis.grid[0] * this.vis.grid[1], "color": "black"}]
            } else if (this.vis.unit === "percent") {
                let percent = (this.vis.range === "percent") ? value : (value / this.visHelperStore.get_range(this.vis)[1])
                return [{"text": (percent*100).toFixed(0), "color": this.vis.color},
                    {"text": "%", "color": "black"}]
            }
            else {
                if (this.vis.range === "percent") {
                    return [{"text": (value).toFixed(2), "color": this.vis.color}]
                }
                else {
                    return [{"text": value.toFixed(0), "color": this.vis.color}]
                }
            }
        },
        /**
         * computes the data to visualize, either directly or from the data_map
         */
        data_to_vis() {
            let data = this.vis.data
            if (this.vis.data_map !== undefined) {
                this.use_column_group_names = true
                data = this.visHelperStore.datamap_to_array(this.column[this.vis.data_map], this.column.options)
            }

            this.visualize(data)
        },
        /**
         * visualizes the data
         *
         * @param data
         */
        visualize(data) {
            let margin_bottom = this.preview ? 20 : 50
            let margin_top = 30
            let margin_right = this.preview ? 20 : 70
            let startBarX = this.helperStore.get_max_length(
                this.use_column_group_names? this.column.options.map(a => a.label) : data.map(d => d.name)) * 10 + 30
            if (this.preview && startBarX > 100) {
                startBarX = 100
            }
            let margin = {top: margin_top, right: margin_right, bottom: margin_bottom, left: startBarX}
            let annotation_width = this.preview ? 0 : this.vis.annotation === "None" ? margin.left : 250
            let width = (this.width ? this.width : 300)*this.vis.size - margin_right - annotation_width
            const icon_padding = 0.1
            const row_padding = 10
            const grid_padding = 10
            this.num_colors = this.vis.color.length

            let max_range = this.get_value(this.visHelperStore.get_range(this.vis, data)[1])
            let max_range_y = Math.ceil(max_range / this.vis.grid[0])
            let max_range_x = Math.ceil(max_range / max_range_y) //reduce number of columns when context icons are hidden

            const dot_range_X = d3.range(0, max_range_x, 1)
            const dot_range_Y = d3.range(0, max_range_y, 1)
            const dot_range = d3.range(0, max_range, 1)

            const max_icon_width = 30

            if ((width/max_range_x) > max_icon_width) width = max_icon_width * max_range_x




            let x = d3.scaleBand()
                .domain(dot_range_X)
                .range([margin.left + grid_padding, width + margin.left])
                .padding(icon_padding)

            const icon_width = x.bandwidth()
            const icon_height = icon_width * this.vis.ratio
            const icon_padding_px = x.step() - x.bandwidth() //padding in pixel to compute height

            const row_height = (icon_height + icon_padding_px) * max_range_y
            //y position inside each row
            let y = d3.scaleBand()
                .domain(dot_range_Y)
                .range([row_height, 0])
                .padding(icon_padding)

            let height = data.length * (row_height + row_padding) // icon_height for margins

            //y position of each row
            let y_row = d3.scaleBand()
                .domain(data.map(d => d.name))
                .range([margin.top + grid_padding, margin.top + grid_padding + height])


            let svg = d3.create("svg")
                .attr("width", width + margin.left + margin.right + annotation_width)
                .attr("height", height + margin.bottom + margin.top + grid_padding * 2)
                .attr("viewBox", [0, 0, width + margin.left + margin.right + annotation_width, height + margin.bottom + margin.top + grid_padding * 2])
                .attr("font-family", this.vis.font_family)

            let bgcolor = this.visHelperStore.get_bgcolor(this.vis.background.color, this.vis.color, this.vis.bgcolor)

            //background
            svg.append("rect")
                .attr("x", margin.left)
                .attr("y", margin.top)
                .attr("width", width + margin.right)
                .attr("height", height + grid_padding * 2)
                .attr("fill", bgcolor)
                .attr("stroke", this.vis.background.stroke)
                .attr("stroke-width", 2)

            let brightness_background = d3.hsl(bgcolor).l
            let contrasting_color = brightness_background > 0.9 ? "#bebebe" : "#fafafa"

            let emptyCircleColor = this.vis.context === true ? contrasting_color : bgcolor

            //one element per option
            svg.selectAll("option")
                .data(data)
                .join("g")
                .attr("x", margin.left)
                .attr("y", d => y_row(d.name))
                .each((par, index, node) => {
                    d3.select(node[index]).selectAll("text")
                        .data(dot_range)
                        .join("text")
                        .attr("x", d => x(Math.floor(d / max_range_y)))
                        .attr("y", d => y_row(par.name) + y(d % max_range_y) + icon_height )
                        .attr("fill", d => ((d + 1) <= this.get_value(par.value)) ? this.vis.color[index%this.num_colors] : emptyCircleColor)
                        .style("font-family", "Material Design Icons")
                        .html(d => ((d + 1) <= this.get_value(par.value)) ?this.getIcon(0) : this.getIcon(1))
                        .style("font-size", d3.max([icon_height, icon_width]) + "px")
                })


            svg.selectAll("textName")
                .data(data)
                .join("text")
                .attr("x", margin.left - 5)
                .attr("y", d => y_row(d.name) + row_height / 2)
                .text(d => this.use_column_group_names ? this.visHelperStore.get_column_label(d, this.column, this.preview) : d.name)
                .style("text-anchor", "end")
                .attr("dy", 7*this.vis.ratio)

            if (!this.preview) {
                svg.selectAll("textValue")
                    .data(data)
                    .join("text")
                    .attr("x", width + margin.left + margin_right - 5)
                    .attr("y", d => y_row(d.name) + row_height / 2)
                    .text("")
                    .style("text-anchor", "end")
                    .style("fill", "black")
                    .each((par, index, node) => {
                        d3.select(node[index]).selectAll("textParts")
                            .data(this.get_value_text(par.value))
                            .join("tspan")
                            .text(d => d.text)
                            .style("fill", d => d.color[index])
                    })
                    .attr("dy", 7*this.vis.ratio)


                //column name
                let yaxis_title = svg.append("text")
                    .attr("x", -(margin.top + (height + grid_padding * 2) / 2))
                    .attr("y", 20)
                    .text("")
                    .style("text-anchor", "middle")
                    .attr("transform", "rotate(-90)")
                this.visHelperStore.append_tspans(yaxis_title, this.vis.yaxis, this.column)


                //axis
                let axis_title = svg.append("text")
                    .attr("x", margin.left + ( width + margin.right) / 2)
                    .attr("y", height + grid_padding * 2 + margin.top + margin.bottom / 2)
                    .style("text-anchor", "middle")
                    .text("")
                this.visHelperStore.append_tspans(axis_title, this.vis.axis, this.column)

            }

            //title
            let title = svg.append("text")
                .attr("x", margin.left + ( width + margin.right) / 2)
                .attr("y", margin.top / 2)
                .style("text-anchor", "middle")
                .text("")
                .style("font-size", this.preview ? "1em" : "1.2em")
            this.visHelperStore.append_tspans(title, this.vis.title, this.column, this.preview)

            //annotations
            //use this.getComputedTextLength to split up into multiple parts?
            let gap = 15
            if (!this.preview && this.vis.annotation !== undefined && this.vis.annotation !== "None") {
                let targets_y = this.vis.annotation.target.map(d => y_row(d))
                let mean_y = targets_y.length > 0 ? d3.mean(targets_y) : height / 2
                //text
                this.vis.annotation.text.forEach((t, i) => {
                    let annotation = svg.append("text")
                        .attr("x", width + margin.left + margin.right + gap)
                        .attr("y", mean_y + i * 15 + row_height / 2)
                        .attr("width", 200)
                        .attr("dy", 7*this.vis.ratio)
                        .style("font-size", "1.09em")
                    this.visHelperStore.append_tspans(annotation, t, this.column)
                })

                //lines
                svg.selectAll("line")
                    .data(targets_y)
                    .join("line")
                    .attr("x1", width + margin.left + margin.right + gap - 10)
                    .attr("y1", d => d + 10)
                    .attr("x2", width + margin.left + margin.right + gap - 10)
                    .attr("y2", d => d + row_height + 10)
                    .attr("stroke", "#505050")
                    .attr("stroke-width", 3)
            }


            d3.select(this.$refs.container).selectAll("*").remove()
            d3.select(this.$refs.container).node().append(svg.node())
            if (!this.preview) {
                this.$emit('svg', svg.node(), width + margin.left + margin.right + annotation_width)
            }
        },
        /**
         * returns current icon used as items of the pictograph
         *
         * @returns {string}
         */
        getIcon(i) {
            // this copies the content from the pseudo element :before as it's needed to show the icon from material design
            const icon = (i === 0) ? this.vis.icon : this.vis.icon2
            const ele = document.querySelector('.mdi-' + icon);
            if (ele) {
                const styles = window.getComputedStyle(ele, ':before');
                return styles.content.replaceAll('"', "");
            }

            return '';
        }
    }
    ,
    mounted() {
        if (this.vis != null && this.column != null) {
            this.data_to_vis()
        }
    }
}
</script>

<style scoped>

</style>