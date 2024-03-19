import {defineStore} from 'pinia'
import * as d3 from "d3";
import {useSimilarityStore} from "@/stores/similarityStore";
import {useDashboardStore} from "@/stores/dashboardStore";


export const useAnnotationStore = defineStore('annotationStore', {
    state: () => ({}),
    actions: {
        /**
         * compute annotations for a summary based on its type
         *
         * @param summary
         * @param type
         * @param unit
         * @param grid
         * @param data
         * @returns {*[]}
         */
        compute_annotations(summary, type, unit = null, grid = null, data = null) {
            if (type === "significance") {
                return this.compute_significance_annotations(summary, unit, grid)
            }
            if (type === "impact") {
                return this.compute_impact_annotations(summary, unit, grid)
            }
            if (type === "similarity") {
                return this.compute_similarity_annotations(summary)
            }
            if (type === "context") {
                return this.compute_context_annotations(summary, unit, grid, data)
            }
            return []
        },
        /**
         * compute annotations based on a summary for significance visualizations
         *
         * @param summary
         * @returns {*[]}
         */
        compute_significance_annotations(summary, unit, grid) {
            let annotations = []
            annotations.push({
                "text": [{"text": "custom", "color": "$text", "italic": "true"}],
                "target": [],
                "score": {explore: 0, convince: 0, educate: 0},}) //empty annotation

            //significance
            if (summary.significance !== undefined && summary.significance.significant_tuples.length === 0 && summary.options.length > 1) {
                annotations.push({
                    "text": [{"text": "Not statistically significant!", "color": "$text", "italic": "true"}],
                    "target": [],
                    "score": {explore: 10, convince: 1, educate: 1},
                })
            } else if (summary.significance !== undefined) {
                //highest significant percentage
                let greatest_significance = summary.significance.significant_tuples.sort((a, b) => summary.percent_target_option[b] - summary.percent_target_option[a])[0]
                let value = summary.percent_target_option[greatest_significance]
                if (unit === "percent") {
                    value = (value * 100).toFixed(0) + "%"
                }
                if (unit === "natural_frequencies") {
                    value = (value * grid[0] * grid[1]).toFixed(0) + "/" + grid[0] * grid[1]

                }
                if (unit === "absolute") {
                        value = value.toFixed(2)
                }
                annotations.push({
                    "text": [{
                        "text": value + " of $rows with a $column of " +
                            summary.options.find(d => d.name === greatest_significance).label + " have $outcome",
                        "color": "$text", "italic": "true"
                    }],
                    "target": [greatest_significance],
                    "score": {explore: 3, convince: 3, educate: 3},
                })

                //risk factor
                if (summary.riskIncrease !== undefined && summary.riskIncrease.risk_factor_groups.length > 1) {
                    let value = summary.riskIncrease.risk_min
                    let text = ""
                    if (unit === "percent") {
                        value = (value * 100).toFixed(0) + "%"
                        text = "$rows with a $column of " + summary.riskIncrease.name + " have a " +
                            value + " or higher risk of $outcome"
                    }
                    if (unit === "natural_frequencies") {
                        value = (value * grid[0] * grid[1]).toFixed(0) + "/" + grid[0] * grid[1]
                        text = value + " or more $rows with a $column of " + summary.riskIncrease.name + " have $outcome"
                    }
                    if (unit === "absolute") {
                        value = value.toFixed(2)
                        text = value + " or more $rows with a $column of " + summary.riskIncrease.name + " have $outcome"
                    }
                    annotations.push({
                        "text": [
                            {
                                "text": text,
                                "color": "$text", "italic": "true"
                            },
                        ],
                        "target": summary.riskIncrease.risk_factor_groups,
                        "score": {explore: 6, convince: 7, educate: 7},
                    })

                }
            }

            let under_hundred = Object.entries(summary.occurrence).filter(([_, value]) => value < 100)
            if (under_hundred.length > 0) {
                if (under_hundred.length === 1) {
                    annotations.push({
                        "text": [
                            {"text": "Based on only " + under_hundred[0][1] + " $rows.", "color": "$text", "italic": "true"}],
                        "target": [under_hundred[0][0]],
                        "score": {explore: 7, convince: 1, educate: 1}
                    })
                } else {
                    let upper_boundary = d3.max(under_hundred.map(([_, value]) => value))
                    upper_boundary = Math.ceil(upper_boundary / 10) * 10  //round up to next 10
                    annotations.push({
                        "text": [
                            {
                                "text": "Each based on fewer than " + upper_boundary + " $rows.",
                                "color": "$text", "italic": "true"
                            }],
                        "target": under_hundred.map(([key, _]) => key),
                        "score": {explore: 7, convince: 1, educate: 1},
                    })
                }
            }

            return this.sort_by_intention(annotations)
        },

        /**
         * compute annotations based on a summary for impact visualizations
         *
         * @param summary
         * @returns {*[]}
         */
        compute_impact_annotations(summary, unit, grid) {
            let annotations = []
            annotations.push({
                "text": [{"text": "custom", "color": "$text", "italic": "true"}],
                "target": [],
                "score": {explore: 0, convince: 0, educate: 0},}) //empty annotation

            //occurrence
            let greatest_occurrence = Object.entries(summary.occurrence).sort((a, b) => b[1] - a[1])[0]
            annotations.push({
                "text": [
                    {
                        "text": "Most $rows have a $column of " + summary.options.find(d => d.name === greatest_occurrence[0]).label,
                        "color": "$text", "italic": "true"
                    }],
                "target": [greatest_occurrence[0]],
                "score": {explore: 5, convince: 3, educate: 7}
            })

            //risk factor
            if (summary.riskIncrease !== undefined && summary.riskIncrease.risk_factor_groups.length >= 1) {
                let value = summary.riskIncrease.occurrence_sum
                let occurrence_all = Object.values(summary.occurrence).reduce((a, b) => a + b, 0)
                let text = ""
                if (unit === "percent") {
                    value = (100*value / occurrence_all).toFixed(0) + "%"
                    text = value + " of $rows have a $column of " + summary.riskIncrease.name
                }
                if (unit === "natural_frequencies") {
                    value = value/occurrence_all
                    text = (value*grid[0]*grid[1]) .toFixed(0)+ "/" + (grid[0]*grid[1]) + " $rows have a $column of " + summary.riskIncrease.name
                }
                if (unit === "absolute") {
                    text = value + " $rows have a $column of " + summary.riskIncrease.name
                }
                annotations.push({
                    "text": [
                        {
                            "text": text,
                            "color": "$text", "italic": "true"
                        },
                    ],
                    "target": summary.riskIncrease.risk_factor_groups,
                    "score": {explore: 3, convince: 7, educate: 3}
                })

            }


            let under_hundred = Object.entries(summary.occurrence).filter(([_, value]) => value < 100)
            if (under_hundred.length > 0) {
                if (under_hundred.length === 1) {
                    annotations.push({
                        "text": [
                            {"text": "Only " + under_hundred[0][1] + " $rows.", "color": "$text", "italic": "true"}],
                        "target": [under_hundred[0][0]],
                        "score": {explore: 7, convince: 1, educate: 1},
                    })
                } else {
                    let upper_boundary = d3.max(under_hundred.map(([_, value]) => value))
                    upper_boundary = Math.ceil(upper_boundary / 10) * 10  //round up to next 10
                    annotations.push({
                        "text": [
                            {
                                "text": "These groups each have fewer than " + upper_boundary + " $rows.",
                                "color": "$text", "italic": "true"
                            }],
                        "target": under_hundred.map(([key, _]) => key),
                        "score": {explore: 7, convince: 1, educate: 1},
                    })
                }
            }

            return this.sort_by_intention(annotations)
        },

        /**
         * compute annotations based on a summary for similarity visualizations
         *
         * @param summary
         * @returns {*[]}
         */
        compute_similarity_annotations(summary) {
            let annotations = []
            annotations.push({
                "text": [{"text": "custom", "color": "$text", "italic": "true"}],
                "target": [],
                "score": {explore: 0, convince: 0, educate: 0},}) //empty annotation
            //similar dashboard columns
            let similar_dashboard_columns = useSimilarityStore().compute_similar_dashboard_columns(summary)
                .sort((a, b) => b.similarity - a.similarity)
            if (similar_dashboard_columns.length > 0) {
                let name_string = similar_dashboard_columns
                    .map(d => d.column.label)
                    .join(", ")
                annotations.push({
                    "text": [
                        {
                            "text": "$column correlates strongly with " + name_string,
                            "color": "$text", "italic": "true"
                        }],
                    "target": [],
                    "score": {explore: 10, convince: 10, educate: 10},
                })
            }

            return this.sort_by_intention(annotations)
        },

        compute_context_annotations(summary, unit, grid, data) {
            let annotations = []
            annotations.push({
                "text": [{"text": "custom", "color": "$text", "italic": "true"}],
                "target": [],
                "score": {explore: 0, convince: 0, educate: 0},}) //empty annotation

            const max_item = data.sort((a, b) => b[1] - a[1])[0]

            let text = []
            if (summary.name === "RiskIncrease") {
                text = [{
                    "text": '$rows with ' + max_item.name + ' have a ' + max_item.value +
                        'x higher risk of $outcome than the rest', "color": "$text", "italic": "true"
                }]

            } else if (summary.name === "AbsoluteValues") {
                let value = 0
                let valueText = ""
                if (unit === "percent") {
                    value = (max_item.value * 100).toFixed(0) + "%"
                    valueText = '$rows with ' + max_item.name + ' have a ' + value +
                        ' risk of $outcome'
                }
                if (unit === "natural_frequencies") {
                    value = (max_item.value * grid[0] * grid[1]).toFixed(0) + "/" + grid[0] * grid[1]
                    valueText = value + " $rows with " + max_item.name + ' have $outcome'
                }
                text = [{
                    "text": valueText, "color": "$text", "italic": "true"
                }]

            } else if (summary.name === "Influence") {
                text = [{"text": max_item.name + ' has the strongest influence on the model', "color": "$text", "italic": "true"}]
            }


            annotations.push({
                "text": text,
                "target": [max_item.name],
                "score": {explore: 5, convince: 5, educate: 5},}) //empty annotation

            return this.sort_by_intention(annotations)
        },

        /**
         * sort by intention
         */
        sort_by_intention(annotations) {
            let intention = useDashboardStore().intention
            annotations.sort( (a,b) => b.score[intention] - a.score[intention])
            return annotations
        }

    }
})