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
            let margin = this.visHelperStore.get_margins(this.preview, this.vis.annotation)

            let width = (this.width ? this.width : 300)*this.vis.size - margin.right
            this.num_colors = this.vis.color.length

            let max_range = this.get_value(this.visHelperStore.get_range(this.vis, data)[1])
            let max_range_x = Math.ceil(this.vis.grid[1])
            let max_range_y = Math.ceil(max_range / max_range_x) //reduce number of columns when context icons are hidden

            const dot_range_X = d3.range(0, max_range_x, 1)
            const dot_range_Y = d3.range(0, max_range_y, 1)
            const dot_range = d3.range(0, max_range, 1)

            //x position of each row
            let x_row = d3.scaleBand()
                .domain(data.map(d => d.name))
                .range([margin.left, margin.left + width])
                .padding(0.1)

            //x position inside each row
            let x = d3.scaleBand()
                .domain(dot_range_X)
                .range([0, x_row.bandwidth()])
                .padding(0.1)

            const icon_width = x.bandwidth()
            const icon_height = icon_width * this.vis.ratio
            const icon_padding_py = x.step() - x.bandwidth() //padding in pixel to compute height

            let height = (icon_height + icon_padding_py) * max_range_y

            let y = d3.scaleBand()
                .domain(dot_range_Y)
                .range([height + margin.top+margin.labels, margin.top  + margin.labels])
                .padding(0.7)



            let svg = this.visHelperStore.create_svg(margin, height, width, this.vis.font_family)

            let bgcolor = this.visHelperStore.get_bgcolor(this.vis.background.color, this.vis.color, this.vis.bgcolor)

            //background
            svg.append("rect")
                .attr("y", margin.top)
                .attr("x", margin.left)
                .attr("height", height + margin.bottom + margin.labels)
                .attr("width", width)
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
                .attr("y", margin.top + margin.labels)
                .attr("x", d => x_row(d.name))
                .each((par, index, node) => {
                    d3.select(node[index]).selectAll("text")
                        .data(dot_range)
                        .join("text")
                        .attr("y", d => y(Math.floor(d / max_range_x)))
                        .attr("x", d => x_row(par.name) + x(d % max_range_x) )
                        .attr("fill", d => ((d + 1) <= this.get_value(par.value)) ? this.vis.color[index%this.num_colors] : emptyCircleColor)
                        .style("font-family", "Material Design Icons")
                        .html(d => ((d + 1) <= this.get_value(par.value)) ?this.getIcon(0) : this.getIcon(1))
                        .style("font-size", d3.max([icon_width, icon_height]) + "px")
                })


            svg.selectAll("textName")
                .data(data)
                .join("text")
                .attr("y", margin.top + margin.labels/2)
                .attr("x", d => x_row(d.name) + x_row.bandwidth() / 2)
                .text(d => this.visHelperStore.get_column_label(d, this.column, this.preview))
                .style("text-anchor", "middle")
                .attr("dy", 5)

            if (!this.preview) {
                svg.selectAll("textValue")
                    .data(data)
                    .join("text")
                    .attr("y", height + margin.top  + margin.labels + margin.bottom/2)
                    .attr("x", d => x_row(d.name) + x_row.bandwidth() / 2)
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
            this.visHelperStore.create_annotations(svg, margin, width, height, x_row, this.vis.annotation, this.column, this.preview, true)


            d3.select(this.$refs.container).selectAll("*").remove()
            d3.select(this.$refs.container).node().append(svg.node())
            if (!this.preview) {
                this.$emit('svg', svg.node(), width + margin.left + margin.right)
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