import {defineStore} from 'pinia'
import {useDataStore} from "@/stores/dataStore";
import {useDashboardStore} from "@/stores/dashboardStore";

export const useVisGeneratorStore = defineStore('VisGeneratorStore', {
    state: () => ({}),
    actions: {
        /**
         * generates standard visualizations for risk factors from settings
         *
         * @returns {*[]}
         */
        generate_main_fact_visList() {
            let visList = []
            visList.push(
                {
                    type: "overall"
                },
                {
                    type: "significance",
                    data_map: 'percent_target_option',
                    options: 'options',
                },
                {
                    type: "impact",
                    data_map: 'occurrence',
                    options: 'options',
                },
            )
            return visList
        },
        /**
         * generates additional visualizations for the fact group
         *
         * @returns {*[]}
         */
        generate_additional_fact_visList(column, similar_dashboard_columns) {
            let visList = []
            visList.push(
                {
                    type: "custom",
                    graph: "text",
                    text: [{"text": "custom text about $column", "color": "black"}],
                }
            )
            if (similar_dashboard_columns.length > 0) {
                visList.push(
                    {
                        type: "similarity",
                        data: similar_dashboard_columns.map(item => ({
                            name: item.column.label,
                            value: item.similarity.toFixed(2)
                        }))
                    }
                )
            }

            return visList
        },
        /**
         * generates context fact groups from selected risk factors
         *
         * @returns {*[]}
         */
        generate_context_fact_groups() {
            let fact_groups = []
            let risk_factor_items = useDashboardStore().dashboard_items.filter(d => d.column.name !== useDataStore().target_column &&
                d.column.riskIncrease !== undefined)
            if (risk_factor_items.length > 0) {
                const options = risk_factor_items.map(item => ({
                    "name":  item.column.name + ": " + item.column.riskIncrease.name,
                    "label": item.column.label + ": " + useDataStore().compute_group_name(item.column.options, item.column.type)
                }))
                const options_short = risk_factor_items.map(item => ({
                    "name": item.column.name,
                    "label": item.column.label
                }))

                const max_risk_multiplier = Math.max(...risk_factor_items.map(item => item.column.riskIncrease.risk_multiplier)) + 1
                const max_weight = Math.max(...risk_factor_items.map(item => item.column['significance'].score['regression'])) +1

                fact_groups.push(
                    //relative risk increase
                    {
                        "visList": [{
                            type: "context",
                            data: risk_factor_items.map(item => ({
                                name: item.column.name + ": " + item.column.riskIncrease.name,
                                value: item.column.riskIncrease.risk_multiplier
                            })).filter(d => d.value !== null).sort((a, b) => b.value - a.value),
                            range: [0, Math.round(max_risk_multiplier)],
                            graph: "bar",
                            unit: "absolute",
                            title: [{text: "$outcome", color: "$color", weight: true}, {text: " risk increase", color: "black", weight: true}],
                            axis: [{text: "(risk exposed) / (risk not exposed)", color: "black"}],
                            yaxis: [{text: "", color: "black"}]
                        }],
                        "column": {name: "RiskIncrease", label: "Risk Increase", options: options, color: useDataStore().get_rand_color()}
                    },
                    //absolute risk
                    {
                        "visList": [{
                            type: "context",
                            data: risk_factor_items.map(item => ({
                                name: item.column.name + ": " + item.column.riskIncrease.name,
                                value: item.column.riskIncrease.absolute_risk
                            })).sort((a, b) => b.value - a.value),
                            graph: "pictograph",
                            range: [0, 1],
                            title: [{text: "Risk of ", color: "black", weight: true},
                                {text: " $outcome", color: "$color", weight: true}],
                            axis: [{text: "$outcome", color: "$color"},
                                {text: " risk per factor", color: "black"}, ],
                            yaxis: [{text: "", color: "black"}]
                        }],
                        "column": {name: "AbsoluteValues", label: "Absolute Risk", options: options, color: useDataStore().get_rand_color()}
                    },
                    //influence strength
                    {
                        "visList": [{
                            type: "context",
                            data: risk_factor_items.map(item => ({
                                name: item.column.name,
                                value: item.column['significance'].score['regression'].toFixed(2)
                            })).sort((a, b) => b.value - a.value),
                            range: [0, Math.round(max_weight)],
                            graph: "bar",
                            unit: "natural_frequencies",
                            title: [{text: "Influence on regression model", color: "black", weight: true}],
                            axis: [{text: "(maximal) weight of factor", color: "black"}],
                            yaxis: [{text: "", color: "black"}]
                        }],
                        "column": {name: "Influence", label: "Influence", options: options_short, color: useDataStore().get_rand_color()}
                    }

                    )
            }

            return fact_groups
        },
        /**
         * generates fact groups for general information about the dataset and target
         */
        generate_general_factGroups() {
            let factGroups = []

            //occurrence of target
            let target_column = useDataStore().column_list.find(d => d.name === useDataStore().target_column)
            if (target_column) {
                factGroups.push({
                    "visList": [{
                        type: 'impact',
                        data_map: 'occurrence'
                    }],
                    "column": useDataStore().column_list.find(d => d.name === useDataStore().target_column)
                })
            }

            //nr of participants
            let csv = useDataStore().csv
            if (csv) {
                factGroups.push({
                    "visList": [{
                        type: 'custom',
                        text: [{text: "The dataset consists of " + csv.length + " $rows.", color: "$color"}]
                    }],
                    "column": {name: "Nr of participants"}
                })
            }

            return factGroups
        },
    }
})