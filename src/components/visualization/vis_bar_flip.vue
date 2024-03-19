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
            let margin = this.visHelperStore.get_margins(this.preview, this.vis.annotation)

            let width = (this.width ? this.width : 300)*this.vis.size - margin.right
            let height = 3*35*this.vis.size
            this.num_colors = this.vis.color.length


            let svg = this.visHelperStore.create_svg(margin, height, width, this.vis.font_family)
                .attr("font-family", this.vis.font_family)

            let y = d3.scaleLinear()
                .domain(this.visHelperStore.get_range(this.vis, data))
                .range([margin.top + margin.labels, height + margin.top + margin.labels])

            let x = d3.scaleBand()
                .domain(data.map(d => d.name))
                .range([margin.left, width + margin.left])
                .padding(0.2)

            //background
            let bgcolor = this.visHelperStore.get_bgcolor(this.vis.background.color, this.vis.color, this.vis.bgcolor)

            svg.append("rect")
                .attr("x", margin.left)
                .attr("y", margin.top)
                .attr("width", width)
                .attr("height", height + margin.bottom + margin.labels)
                .attr("fill", bgcolor)
                .attr("stroke", this.vis.background.stroke)
                .attr("stroke-width", 2)

            svg.selectAll("bar")
                .data(data)
                .join("rect")
                .attr("y", d => margin.top + 2*margin.labels + 2*height -  y(d.value) - y(0))
                .attr("x", d => x(d.name))
                .attr("height", d => y(d.value) - y(0))
                .attr("width", x.bandwidth())
                .attr("fill", (d, i) => this.vis.color[i%this.num_colors])

            svg.selectAll("textName")
                .data(data)
                .join("text")
                .attr("y", margin.top + margin.labels/2)
                .attr("x", d => x(d.name) + x.bandwidth() / 2)
                .text(d => this.visHelperStore.get_column_label(d, this.column, this.preview))
                .style("text-anchor", "middle")
                .attr("dy", 5)

            if (!this.preview) {
                svg.selectAll("textValue")
                    .data(data)
                    .join("text")
                    .attr("y", margin.top + margin.labels + height + margin.bottom/2)
                    .attr("x", d => x(d.name)+ x.bandwidth() / 2)
                    .text(d => this.get_value_text(d.value))
                    .style("text-anchor", "middle")
                    .style("fill", "black")

            }


            //title
            this.visHelperStore.create_title(svg, margin, width, this.vis.title, this.column, this.preview)

            //annotations
            this.visHelperStore.create_annotations(svg, margin, width, height, x, this.vis.annotation, this.column, this.preview, true)


            d3.select(this.$refs.container).selectAll("*").remove()
            d3.select(this.$refs.container).node().append(svg.node())
            if (!this.preview) {
                this.$emit('svg', svg.node(), width + margin.left + margin.right)
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