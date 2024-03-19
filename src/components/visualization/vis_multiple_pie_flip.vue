<template>
    <div ref="container"/>
</template>

<script>
import * as d3 from "d3";
import {useHelperStore} from "@/stores/helperStore";
import {useDataStore} from "@/stores/dataStore";
import {useVisHelperStore} from "@/stores/visHelperStore";

export default {
    name: "vis_multiple_pie_flip",
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
            let margin = this.visHelperStore.get_margins(this.preview, this.vis.annotation)
            let width = (this.width ? this.width : 300)*this.vis.size - margin.right
            this.num_colors = this.vis.color.length

            //background
            let bgcolor = this.visHelperStore.get_bgcolor(this.vis.background.color, this.vis.color, this.vis.bgcolor)

            let emptyCircleColor = this.vis.context === true ? d3.color("white").darker(0.1) : bgcolor

            let color = d3.scaleOrdinal()
                .domain(["value", "rest"])
                .range(["id", emptyCircleColor])


            let x_options = d3.scaleBand()
                .domain(data.map(d => d.name))
                .range([margin.left, width + margin.left]) //radius times three as outer padding
                .paddingInner(0.3)
                .paddingOuter(0.2)

            const radius = d3.min([60, x_options.bandwidth() / 2])

            let pie = d3.pie()
                .value(d => d.value)
                .sort(a => a.name === "value" ? 1 : -1)

            let height = radius * 2 + 20

            let svg = this.visHelperStore.create_svg(margin, height, width, this.vis.font_family)

            svg.append("rect")
                .attr("x", margin.left)
                .attr("y", margin.top)
                .attr("width", width)
                .attr("height", height + margin.top + margin.labels)
                .attr("fill", bgcolor)
                .attr("stroke", this.vis.background.stroke)
                .attr("stroke-width", 2)

            //one element per option
            svg.selectAll("option")
                .data(data)
                .join("g")
                .attr("transform", d => "translate("+ +(x_options(d.name) + x_options.bandwidth() / 2)  + "," + +(margin.top + margin.labels + radius )  + ")")
                .attr("y", margin.top + margin.labels)
                .attr("x", d => x_options(d.name))
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
                .attr("y", margin.top + margin.labels/2)
                .attr("x", d => x_options(d.name) + x_options.bandwidth() / 2)
                .text(d => this.visHelperStore.get_column_label(d, this.column, this.preview))
                .style("text-anchor", "middle")
                .attr("dy", 5)

            if (!this.preview) {
                svg.selectAll("textValue")
                    .data(data)
                    .join("text")
                    .attr("y", height + margin.top  + margin.labels + margin.bottom/2)
                    .attr("x", d => x_options(d.name) + x_options.bandwidth() / 2)
                    .text("")
                    .style("text-anchor", "middle")
                    .style("fill", "black")
                    .each((par, index, node) => {
                        d3.select(node[index]).selectAll("textParts")
                            .data(this.get_value_text(par.value))
                            .join("tspan")
                            .text(d => d.text)
                            .style("fill", d => d.color[index])
                    })

            }

            //title
            this.visHelperStore.create_title(svg, margin, width, this.vis.title, this.column, this.preview)

            //annotations
            this.visHelperStore.create_annotations(svg, margin, width, height, x_options, this.vis.annotation, this.column, this.preview, true)

            d3.select(this.$refs.container).selectAll("*").remove()
            d3.select(this.$refs.container).node().append(svg.node())
            if (!this.preview) {
                this.$emit('svg', svg.node(), width + margin.left + margin.right)
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