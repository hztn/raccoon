import {defineStore} from 'pinia'
import {useHelperStore} from "@/stores/helperStore";
import * as d3 from "d3";

export const useVisHelperStore = defineStore('VisHelperStore', {
    state: () => ({}),
    actions: {
        /**
         * returns the range of the data
         *
         * @returns {number[]|*}
         */
        get_range(vis, data = []) {
            if (vis.context === true || data.length === 0) {
                if (vis.range === "percent") {
                    return [0, 1]
                } else {
                    return vis.range
                }
            }
            else {
                let max = d3.max(data, d => +d.value)
                let margin = 0.05 //percent added as margin
                if (vis.range === "percent") {
                    return [0, max+(max*margin)]
                }
                else {
                    return [vis.range[0], max+(max*margin)]
                }
            }

        },
        /**
         * returns the label of the column
         *
         * @param d
         * @param column
         * @param preview
         * @returns {string}
         */
        get_column_label(d, column, preview) {
            let label = (d.name === "") ? "null" : column.options.find(x => x.name === d.name).label
            let boundary = 30 / column.options.length
            let text_length = Math.max(boundary-4, 2)
            return (preview && label.length > boundary) ? label.substring(0, text_length) + "..." : label
        },
        /**
         * converts datamap of a column to an array
         *
         * @param data
         * @returns {{name: *, value: *}[]}
         */
        datamap_to_array(data, options) {
            let array = Object.entries(data).map(([key, value]) => ({
                "name": key,
                "value": value
            }))
            array = array.sort((a, b) => useHelperStore().sort(
                options.find(x => x.name === a.name),
                options.find(x => x.name === b.name)))

            return array
        },
        /**
         * add text as tspans to an element to enable differently colored text segments
         *
         * @param el
         * @param text
         * @param column
         * @param preview
         */
        append_tspans(el, text, column, preview = false) {
            let text_array = useHelperStore().parse_text(text, column)

            el.selectAll("tspan")
                .data(text_array)
                .join("tspan")
                .text(d => d.text)
                .style("fill", d => d.color)
                .style("font-weight", d => d.weight && !preview ? "bold" : "normal")
                .style("font-style", d => d.italic && !preview? "italic" : "normal")
        },
        /**
         * returns background color. If background is set to auto, an appropriate color is selected. Else the background color is returned.
         *
         * @param background
         * @param colors
         * @returns {*}
         */
        get_bgcolor(background, colors, bg_index) {
            let bgcolor = background
            if (background === "auto") {

                let length = colors.length
                let index = Math.floor(length / 2) + bg_index
                if (index < 0) index += length
                if (index >= length) index -= length

                bgcolor = d3.hsl(colors[index])
                bgcolor.s = bgcolor.s * 0.2
                bgcolor.l += (1 - bgcolor.l) * 0.8
            }
            return d3.color(bgcolor).formatHex()
        },
        /**
         * create color list out of color specifications
         *
         * @param specification
         * @param standard
         * @param options
         * @returns {*[]}
         */
        create_color_list(specification, standard, options) {
            let length = options.length
            if (specification.type === "standard") {
                if (standard.type === "scheme") {
                    let color = d3.hsl(standard.color)
                    let spread = standard.spread

                    //start in the middle
                    let start_h_offset = spread * (length - 1) / 2
                    color.h += start_h_offset

                    //individualize h
                    color.h += Math.floor(specification.value * standard.global_spread)

                    if (color.h < 0) color.h += 360

                    //create list
                    let list = []
                    for (let i = 0; i < length; i++) {
                        list.push(color.formatHex())
                        color.h -= spread
                        if (color.h < 0) color.h += 360
                    }
                    return list
                } else if (standard.type === "focus") {
                    let color = d3.hsl(standard.color)
                    color.h += Math.floor(specification.value * standard.global_spread)

                    //create list
                    let list = []
                    for (let i = 0; i < length; i++) {
                        if (options[i].risk_group) {
                            list.push(color.formatHex())
                        }
                        else {
                            list.push(standard.neutralColor)
                        }
                    }
                    //if none of the options was a risk group, use the risk group color for all
                    if (list.every(x => x === standard.neutralColor)) {
                        for (let i = 0; i < length; i++) {
                            list[i] = color.formatHex()
                        }
                    }

                    return list


                } else
                    return standard.list
            }
            else {
                return specification.list
            }
        },
        /**
         * return margins
         */
        get_margins(preview, annotation) {
            let margin_bottom = preview? 10 : 30
            let margin_top = 30
            let labels_height = 50
            let margin_right = preview? 5 : 10
            let margin_left = preview? 5 : 10
            let gap = 20
            let annotation_height = preview? 0 : annotation === "None" ? 10 : annotation.text.length * 18 + gap + 5
            let margin = {top: margin_top, right: margin_right, bottom: margin_bottom, left: margin_left,
                            labels: labels_height, annotation: annotation_height, gap: gap}
            return margin
        },
        /**
         * create SVG
         */
        create_svg(margin, height, width, font_family) {
            return d3.create("svg")
                .attr("height", height + margin.top + margin.labels + margin.bottom + margin.annotation)
                .attr("width", width + margin.right + margin.left)
                .attr("viewBox", [0, 0, width + margin.left + margin.right, height + margin.top + margin.labels +margin.bottom + margin.annotation])
                .attr("font-family", font_family)
        },
        /**
         * create title
         */
        create_title(svg, margin, width, text, column, preview) {
            let title = svg.append("text")
                .attr("x", margin.left + width / 2)
                .attr("y", margin.top / 2)
                .style("text-anchor", "middle")
                .text("")
                .style("font-size", preview ? "1em" : "1.2em")
            this.append_tspans(title, text, column, preview)
        },
        /**
         * create annotation
         */
        create_annotations(svg, margin, width, height, x, annotation, column, preview, addLine) {
                        //use this.getComputedTextLength to split up into multiple parts?
            if (!preview && annotation !== undefined && annotation !== "None") {
                let targets_y = annotation.target.map(d => x(d))
                //text
                annotation.text.forEach((t, i) => {
                    let annotation = svg.append("text")
                        .attr("y", height + margin.top + margin.labels + margin.bottom + margin.gap + 18*i)
                        .attr("x", margin.left + width/2)
                        .style("text-anchor", "middle")
                        .attr("width", width)
                        .attr("dy", 9)
                        .style("font-size", "1.09em")
                    this.append_tspans(annotation, t, column)
                })

                //lines
                if (addLine) {
                    svg.selectAll("line")
                    .data(targets_y)
                    .join("line")
                    .attr("y1", height + margin.top + margin.labels + margin.bottom + 5)
                    .attr("x1", d => d )
                    .attr("y2", height + margin.top + margin.labels + margin.bottom + 5)
                    .attr("x2", d => d + x.bandwidth() )
                    .attr("stroke", "darkgrey")
                    .attr("stroke-width", 5)
                }

            }
        }
    }
})