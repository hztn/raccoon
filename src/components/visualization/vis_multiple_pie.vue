<template>
    <div ref="container"/>
</template>

<script>
import * as d3 from "d3";
import {useHelperStore} from "@/stores/helperStore";
import {useDataStore} from "@/stores/dataStore";
import {useVisHelperStore} from "@/stores/visHelperStore";

export default {
    name: "vis_multiple_pie",
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
        /*
        * returns value as float between 0 and 1
         */
        get_value_float(value) {
            return (this.vis.range === "percent") ? value : (value / this.visHelperStore.get_range(this.vis)[1])
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
            let margin_right = this.preview ? 5 : 60
            let width = (this.width ? this.width : 300)*this.vis.size - margin_right
            let startBarX = this.helperStore.get_max_length(
                this.use_column_group_names ? this.column.options.map(a => a.label) : data.map(d => d.name)) * 10 + 30
            if (this.preview && startBarX > 100) {
                startBarX = 100
            }
            let margin = {top: margin_top, right: margin_right, bottom: margin_bottom, left: startBarX}
            let annotation_width = this.preview ? 0 : this.vis.annotation === "None" ? margin.left : 250
            this.num_colors = this.vis.color.length


            const radius = 30
            if (width > radius * 7) {
                width = radius * 7
            }

            let pie = d3.pie()
                .value(d => d.value)
                .sort(a => a.name === "value" ? 1 : -1)

            let height = data.length * (radius * 2 + 20)

            //background
            let bgcolor = this.visHelperStore.get_bgcolor(this.vis.background.color, this.vis.color, this.vis.bgcolor)

            let emptyCircleColor = this.vis.context === true ? d3.color("white").darker(0.1) : bgcolor

            let color = d3.scaleOrdinal()
                .domain(["value", "rest"])
                .range(["id", emptyCircleColor])


            let y_options = d3.scaleBand()
                .domain(data.map(d => d.name))
                .range([margin.top + 10, height + margin.top]) //radius times three as outer padding


            let svg = d3.create("svg")
                .attr("width", width + margin.left + margin.right + annotation_width)
                .attr("height", height + margin.bottom + margin.top)
                .attr("viewBox", [0, 0, width + margin.left + margin.right + annotation_width, height + margin.bottom + margin.top])
                .attr("font-family", this.vis.font_family)

            svg.append("rect")
                .attr("x", margin.left)
                .attr("y", margin.top)
                .attr("width", width)
                .attr("height", height)
                .attr("fill", bgcolor)
                .attr("stroke", this.vis.background.stroke)
                .attr("stroke-width", 2)

            //one element per option
            svg.selectAll("option")
                .data(data)
                .join("g")
                .attr("transform", d => "translate(" + +(margin.left + radius * 2) + "," + +(y_options(d.name) + radius) + ")")
                .attr("x", margin.left)
                .attr("y", d => y_options(d.name))
                .each((par, index, node) => {
                    d3.select(node[index]).selectAll('pieParts')
                        .data(pie([{"name": "value", "value": this.get_value_float(par.value)}, {
                            "name": "rest",
                            "value": 1 - this.get_value_float(par.value)
                        }]))
                        .enter()
                        .append('path')
                        .attr('d', d3.arc()
                            .innerRadius(0)
                            .outerRadius(radius)
                        )
                        .attr('fill', d => (color(d) === "id" ? this.vis.color[index%this.num_colors] : color(d)))
                })


            svg.selectAll("textName")
                .data(data)
                .join("text")
                .attr("x", margin.left - 5)
                .attr("y", d => y_options(d.name) + y_options.bandwidth() / 2)
                .text(d => this.use_column_group_names ? this.visHelperStore.get_column_label(d, this.column, this.preview) : d.name)
                .style("text-anchor", "end")

            if (!this.preview) {
                svg.selectAll("textValue")
                    .data(data)
                    .join("text")
                    .attr("x", margin.left + radius * 4)
                    .attr("y", d => y_options(d.name) + y_options.bandwidth() / 2)
                    .text("")
                    .style("text-anchor", "start")
                    .style("fill", "black")
                    .each((par, index, node) => {
                        d3.select(node[index]).selectAll("textParts")
                            .data(this.get_value_text(par.value))
                            .join("tspan")
                            .text(d => d.text)
                            .style("fill", d => d.color[index])
                    })

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
                let targets_y = this.vis.annotation.target.map(d => y_options(d))
                let mean_y = targets_y.length > 0 ? d3.mean(targets_y) : height / 2
                //text
                this.vis.annotation.text.forEach((t, i) => {
                    let annotation = svg.append("text")
                        .attr("x", width + margin.left + gap)
                        .attr("y", mean_y + i * 15 + y_options.bandwidth() / 2)
                        .attr("width", 200)
                        .style("font-size", "1.09em")
                    this.visHelperStore.append_tspans(annotation, t, this.column)
                })

                //lines
                svg.selectAll("line")
                    .data(targets_y)
                    .join("line")
                    .attr("x1", width + margin.left + gap - 10)
                    .attr("y1", d => d)
                    .attr("x2", width + margin.left + gap - 10)
                    .attr("y2", d => d + y_options.bandwidth())
                    .attr("stroke", "#505050")
                    .attr("stroke-width", 3)
            }

            d3.select(this.$refs.container).selectAll("*").remove()
            d3.select(this.$refs.container).node().append(svg.node())
            if (!this.preview) {
                this.$emit('svg', svg.node(), width + margin.left + margin.right + annotation_width)
            }
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