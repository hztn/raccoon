<template>
    <div ref="container"/>
</template>

<script>
import * as d3 from "d3";
import {useHelperStore} from "@/stores/helperStore";
import {useVisHelperStore} from "@/stores/visHelperStore";

export default {
    name: "vis_pie",
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
            let startBarX = this.helperStore.get_max_length(
                this.use_column_group_names ? this.column.options.map(a => a.label) : data.map(d => d.name)) * 10 + 30
            let margin_colors = 30
            startBarX = startBarX + margin_colors
            let margin_bottom = this.preview ? 20 : 50
            let margin = {top: 30, bottom: margin_bottom, left: startBarX, right: 5}

            let annotation_width = this.preview ? 0 : this.vis.annotation === "None" ? margin.left : 250
            
            let width = (this.width ? this.width : 300) * this.vis.size - margin.right - annotation_width

            if (this.preview || this.vis.pie_labels === "inside") {
                const margin_axis = 40
                width += startBarX -margin_colors - margin_axis
                margin.left=margin_axis
                startBarX = 0
            }
            this.num_colors = this.vis.color.length

            let height = 200



            let svg = d3.create("svg")
                .attr("width", width + margin.left + margin.right + annotation_width)
                .attr("height", height + margin.bottom + margin.top)
                .attr("viewBox", [0, 0, width + margin.left + margin.right + annotation_width, height + margin.bottom + margin.top])
                .attr("font-family", this.vis.font_family)

            let brighterColor = d3.interpolateRgb("white", this.vis.color)(0.2)
            let darkerColor = d3.interpolateRgb("black", this.vis.color)(0.8)
            let color = d3.scaleOrdinal()
                .domain(data.map(d => d.name))
                .range(d3.quantize(d3.interpolateRgb(brighterColor, darkerColor), data.length))

            let pie = d3.pie()
                .value(d => d.value)
                .sort(null)

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

            let radius = Math.min(width, height) / 3

            let pie_container = svg.append("g")
                .attr("transform", "translate(" + +(margin.left + width / 2) + "," + +(margin.top + height / 2) + ")")

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
                        .attr("x", margin.left - margin_colors)
                        .attr("y", d => y(d.name))
                        .text(d => this.use_column_group_names ? this.visHelperStore.get_column_label(d, this.column, this.preview) : d.name)
                        .style("text-anchor", "end")
                        .attr("dy", y.bandwidth() / 2 + 5)

                    svg.selectAll("textColor")
                        .data(data)
                        .join("rect")
                        .attr("x", margin.left - margin_colors + 5)
                        .attr("y", d => y(d.name) + y.bandwidth() / 2 - 10)
                        .attr("width", 20)
                        .attr("height", 20)
                        .attr("fill", d => color(d.name))

                }

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
                .attr("x", margin.left + (width + margin.right) / 2)
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
                if (this.vis.pie_labels === "inside") {
                    mean_y = height / 2
                }
                //text
                this.vis.annotation.text.forEach((t, i) => {
                    let annotation = svg.append("text")
                        .attr("x", width + margin.left + margin.right + gap)
                        .attr("y", mean_y + i * 15 + y.bandwidth() / 2)
                        .attr("width", 200)
                        .style("font-size", "1.09em")
                    this.visHelperStore.append_tspans(annotation, t, this.column)
                })

                if (this.vis.pie_labels === "outside" || this.vis.pie_labels === "both") {
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