<template>
    <div ref="container"/>
</template>

<script>
import * as d3 from "d3";
import {useHelperStore} from "@/stores/helperStore";
import {useVisHelperStore} from "@/stores/visHelperStore";

export default {
    name: "vis_bar",
    props: [
        "vis", "column", "width", "preview"
    ],
    emits: ["svg"],
    setup() {
        const helperStore = useHelperStore()
        const visHelperStore = useVisHelperStore()
        return {helperStore, visHelperStore}
    },
    data: function() {
        return {
            use_column_group_names: false,
            num_colors: 5
        }
    },
    methods: {
        /**
         * returns value as pretty text
         *
         * @param value
         * @returns {*|string}
         */
        get_value_text(value) {
            if (this.vis.range === "percent") {
                if (this.vis.unit === "natural_frequencies") {
                    let grid_size = this.vis.grid[0] * this.vis.grid[1]
                    return (value * grid_size).toFixed(0) + "/" + grid_size
                }
                else if (this.vis.unit === "percent") {
                    return (value * 100).toFixed(0) + "%"
                }
                else {
                    return value.toFixed(2)
                }
            }
            else {
                let frequency = value / this.visHelperStore.get_range(this.vis)[1]
                if (this.vis.unit === "percent") {
                    return (frequency * 100).toFixed(0) + "%"
                }
                if (this.vis.unit === "natural_frequencies") {
                    let grid_size = this.vis.grid[0] * this.vis.grid[1]
                    return (frequency* grid_size).toFixed(0) + "/" + grid_size
                }
            }
            return value
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
            let startBarX = this.helperStore.get_max_length(
                this.use_column_group_names? this.column.options.map(a => a.label) : data.map(d => d.name)) * 10 + 30
            if (this.preview && startBarX > 100) {
                startBarX = 100
            }
            let margin_bottom = this.preview ? 20 : 50
            let margin = {top: 30, bottom: margin_bottom, left: startBarX, right: 5}
            let annotation_width = this.preview ? 0 : this.vis.annotation === "None" ? margin.left : 250

            let width = (this.width ? this.width : 300)*this.vis.size - margin.right - annotation_width
            let height = data.length * 35*this.vis.size
            this.num_colors = this.vis.color.length


            let svg = d3.create("svg")
                .attr("width", width + margin.left + margin.right + annotation_width)
                .attr("height", height + margin.bottom + margin.top)
                .attr("viewBox", [0, 0, width + margin.left + margin.right + annotation_width, height + margin.bottom + margin.top])
                .attr("font-family", this.vis.font_family)

            let x = d3.scaleLinear()
                .domain(this.visHelperStore.get_range(this.vis, data))
                .range([margin.left, width + margin.left])

            let y = d3.scaleBand()
                .domain(data.map(d => d.name))
                .range([margin.top, height + margin.top])
                .padding(0.2)

            //background
            let bgcolor = this.visHelperStore.get_bgcolor(this.vis.background.color, this.vis.color, this.vis.bgcolor)

            svg.append("rect")
                .attr("x", margin.left)
                .attr("y", margin.top)
                .attr("width", width)
                .attr("height", height)
                .attr("fill", bgcolor)
                .attr("stroke", this.vis.background.stroke)
                .attr("stroke-width", 2)

            svg.selectAll("bar")
                .data(data)
                .join("rect")
                .attr("x", margin.left)
                .attr("y", d => y(d.name))
                .attr("width", d => x(d.value) - x(0))
                .attr("height", y.bandwidth())
                .attr("fill", (d, i) => this.vis.color[i%this.num_colors])

            svg.selectAll("textName")
                .data(data)
                .join("text")
                .attr("x", margin.left - 5)
                .attr("y", d => y(d.name))
                .text(d => this.use_column_group_names ? this.visHelperStore.get_column_label(d, this.column, this.preview) : d.name)
                .style("text-anchor", "end")
                .attr("dy", y.bandwidth() - 5)

            if (!this.preview) {
                svg.selectAll("textValue")
                    .data(data)
                    .join("text")
                    .attr("x", d => (this.get_value_text(d.value).toString().length*5 < x(d.value) - x(0)) ? margin.left : margin.left + x(d.value) - x(0))
                    .attr("y", d => y(d.name))
                    .text(d => this.get_value_text(d.value))
                    .style("text-anchor", "start")
                    .style("fill", d => (this.get_value_text(d.value).toString().length*5 < x(d.value) - x(0)) ? "white" : "#202020")
                    .attr("dy", y.bandwidth() - 5)

                //column name
                let yaxis_title = svg.append("text")
                    .attr("x", -(margin.top + height / 2))
                    .attr("y", 20)
                    .text("")
                    .style("text-anchor", "middle")
                    .attr("transform", "rotate(-90)")
                this.visHelperStore.append_tspans(yaxis_title, this.vis.yaxis, this.column)


                //axis
                let axis_title = svg.append("text")
                    .attr("x", margin.left + width / 2)
                    .attr("y", height + margin.top + margin.bottom / 2)
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
                let targets_y = this.vis.annotation.target.map(d => y(d))
                let mean_y = targets_y.length > 0 ? d3.mean(targets_y) : height / 2
                //text
                this.vis.annotation.text.forEach((t, i) => {
                    let annotation = svg.append("text")
                        .attr("x", width + margin.left + margin.right + gap)
                        .attr("y", mean_y + i * 15 + y.bandwidth() / 2)
                        .attr("width", 200)
                        .style("font-style", "italic")
                        .style("font-size", "1.09em")
                    this.visHelperStore.append_tspans(annotation, t, this.column)
                })

                //lines
                svg.selectAll("line")
                    .data(targets_y)
                    .join("line")
                    .attr("x1", width + margin.left + margin.right + gap - 10)
                    .attr("y1", d => d)
                    .attr("x2", width + margin.left + margin.right + gap - 10)
                    .attr("y2", d => d + y.bandwidth())
                    .attr("stroke", "#505050")
                    .attr("stroke-width", 3)
            }


            d3.select(this.$refs.container).selectAll("*").remove()
            d3.select(this.$refs.container).node().append(svg.node())
            if (!this.preview) {
                this.$emit('svg', svg.node(), width + margin.left + margin.right + annotation_width)
            }
        }
    },
    mounted() {
        if (this.vis != null && this.column != null) {
            this.data_to_vis()
        }
    }
}
</script>

<style scoped>

</style>