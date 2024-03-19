<template>
    <div ref="container"/>
</template>

<script>
import * as d3 from "d3";
import {useHelperStore} from "@/stores/helperStore";
import {useVisHelperStore} from "@/stores/visHelperStore";

export default {
    name: "vis_pie_flip",
    props: [
        "vis", "column", "width", "preview"
    ],
    emits: ["svg"],
    setup() {
        const helperStore = useHelperStore()
        const visHelperStore = useVisHelperStore()
        return {helperStore, visHelperStore}
    },
    data: function () {
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
                return (value * 100).toFixed(0) + "%"
            }
            if (this.vis.unit === "percent") {
                return (value / this.visHelperStore.get_range(this.vis)[1] * 100).toFixed(0) + "%"
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
            let margin_colors = 40

            let width = (this.width ? this.width : 300)*this.vis.size - margin.right
            let height = (this.preview? 3 : 6)*35*this.vis.size
            this.num_colors = this.vis.color.length
            let showOuterLabels = this.vis.pie_labels === "outside" || this.vis.pie_labels === "both"

            if (!showOuterLabels) margin.labels = 0
            margin.bottom = 0

            let svg = this.visHelperStore.create_svg(margin, height, width, this.vis.font_family)

            let pie = d3.pie()
                .value(d => d.value)
                .sort(null)

            let y = d3.scaleBand()
                .domain(data.map(d => d.name))
                .range([margin.top+ margin.labels, height + margin.top+ margin.labels])
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

            let radius = Math.min(width, height) / 3

            let pie_container = svg.append("g")
                .attr("transform", "translate(" + +(margin.left + width / 2) + "," + +(margin.top + margin.labels + height / 2) + ")")

            const arc = d3.arc()
                .innerRadius(0)
                .outerRadius(radius);

            //pie
            pie_container.selectAll('pieParts')
                .data(pie(data))
                .enter()
                .append('path')
                .attr('d', arc)
                .attr('fill', (d,i) => this.vis.color[i%this.num_colors])
                .attr("stroke", "black")
                .style("stroke-width", "1.5px")


            if (this.vis.pie_labels === "inside" || this.vis.pie_labels === "both") {
                //inner pie labels
                const arcLabel = d3.arc()
                    .innerRadius(0)
                    .outerRadius(radius * 2.5);

                const line_color = "#303030"

                pie_container.selectAll('pieLabels')
                    .data(pie(data))
                    .enter()
                    .append('text')
                    .attr('x', d => arcLabel.centroid(d)[0] < 0 ? -radius * 1.2 : radius * 1.2)
                    .attr('y', d => arcLabel.centroid(d)[1])
                    .style("text-anchor", d => arcLabel.centroid(d)[0] < 0 ? "end" : "start")
                    .text(d => this.use_column_group_names ? this.visHelperStore.get_column_label(d.data, this.column, this.preview) : d.data.name)
                    .attr("dy", "0.35em")
                    .attr("dx", d => arcLabel.centroid(d)[0] < 0 ? "-0.25em" : "0.25em")

                pie_container.selectAll('pieLines0')
                    .data(pie(data))
                    .enter()
                    .append('path')
                    .attr('d', d => {
                        let path = d3.path();
                        path.moveTo(arc.centroid(d)[0] * 1.5, arc.centroid(d)[1] * 1.5);
                        path.lineTo(arcLabel.centroid(d)[0], arcLabel.centroid(d)[1]);
                        path.closePath()
                        return path
                    })
                    .attr("stroke", line_color)

                pie_container.selectAll('pieLines1')
                    .data(pie(data))
                    .enter()
                    .append('path')
                    .attr('d', d => {
                        let path = d3.path();
                        path.moveTo(arcLabel.centroid(d)[0] < 0 ? -radius * 1.2 : radius * 1.2, arcLabel.centroid(d)[1]);
                        path.lineTo(arcLabel.centroid(d)[0], arcLabel.centroid(d)[1]);
                        path.closePath()
                        return path
                    })
                    .attr("stroke", line_color)
            }


            if (!this.preview) {

                if (this.vis.pie_labels === "outside" || this.vis.pie_labels === "both") {
                    //outer pie legend
                    svg.selectAll("textName")
                        .data(data)
                        .join("text")
                        .attr("x", margin.left + margin_colors)
                        .attr("y", d => y(d.name))
                        .text(d => this.visHelperStore.get_column_label(d, this.column, this.preview))
                        .style("text-anchor", "start")
                        .attr("dy", y.bandwidth() / 2 + 5)

                    svg.selectAll("textColor")
                        .data(data)
                        .join("rect")
                        .attr("x", margin.left + 10)
                        .attr("y", d => y(d.name) + y.bandwidth() / 2 - 10)
                        .attr("width", 20)
                        .attr("height", 20)
                        .attr("fill", (d,i) => this.vis.color[i%this.num_colors])

                }
            }


            //title
            this.visHelperStore.create_title(svg, margin, width, this.vis.title, this.column, this.preview)

            //annotations
            let x_function = d => 0
            this.visHelperStore.create_annotations(svg, margin, width, height, x_function, this.vis.annotation, this.column, this.preview, showOuterLabels)


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