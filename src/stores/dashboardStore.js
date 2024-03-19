import {defineStore} from 'pinia'
import {useDataStore} from "@/stores/dataStore";
import {useRegressionStore} from "@/stores/regressionStore";
import {useSimilarityStore} from "@/stores/similarityStore";
import {useVisGeneratorStore} from "@/stores/visGeneratorStore";

import default_settings_json from "@/stores/default_settings.json"
import * as d3 from "d3";

export const useDashboardStore = defineStore('dashboardStore', {
    state: () => ({
        dashboard_items: [],
        current_fact_group: null,
        current_fact_group_exports: [],
        current_fact_index: null,
        excluded_columns: [],
        confounding_factors: [],
        intention: "explore",
        default_settings: JSON.parse(JSON.stringify(default_settings_json)),
        default_colors: {
                "explore":
                    {
                        "background": {color: "auto", stroke: "None"},
                        "colors": {"type": "scheme", "color": "#1302b5", "neutralColor": "#A8A8A8", "spread": 45, "global_spread": 100, "list": d3.quantize(d3.interpolateCool, 5).map(d => d3.color(d).hex())},
                        "text": "#181818",
                        "font_family": "inherit",
                    },
                "convince":
                    {
                        "background": {color: "white", stroke: "darkgray"},
                        "colors": {"type": "focus", "color": "#D3003B", "neutralColor": "#A8A8A8", "spread": 30, "global_spread": 0, "list": d3.quantize(d3.interpolateCool, 5).map(d => d3.color(d).hex())},
                        "text": "#181818",
                        "font_family": "inherit",
                    },
                "educate":
                    {
                        "background": {color: "auto", stroke: "None"},
                        "colors": {"type": "scheme", "color": "#40AD7B", "neutralColor": "#A8A8A8", "spread": 55, "global_spread": 100, "list": d3.quantize(d3.interpolateCool, 5).map(d => d3.color(d).hex())},
                        "text": "#181818",
                        "font_family": "inherit",
                    }
        }

    }),
    actions: {
        /**
         * adds a new fact group to the dashboard
         *
         * @param summary
         * @param visList
         * @param recalculate
         */
        add_dashboard_item(summary, visList, recalculate = true) {
            this.dashboard_items.push({
                "name": summary.name,
                "column": summary,
                "visList": visList
            })
            if (summary.percent_target_option !== undefined && summary.name !== useDataStore().target_column) {
                this.add_confounding_factor(summary)
            }
            this.update_dashboard_context()
            this.update_dashboard_similarity()
            if (recalculate) {
                useRegressionStore().compute_score()
            }
        },
        /**
         * removes a fact group from the dashboard
         *
         * @param name
         */
        remove_dashboard_item(name) {
            this.dashboard_items = this.dashboard_items.filter(item => item.name !== name)
            this.remove_confounding_factor(name)
            useRegressionStore().compute_score()
            this.update_dashboard_context()
            this.update_dashboard_similarity()
        },

        /**
         * sets default settings for visualizations to adapt them to current dataset
         *
         * @param length
         */
        set_initial_default_settings(length) {
            this.default_settings.impact.range = [0, length]

            this.update_settings_by_intention()

        },
        /**
         * updates default settings for visualizations to adapt them to current intention
         */
        update_settings_by_intention() {
            //consider intention
            if (this.intention === "explore") {
                ["significance", "context", "custom", "overall"].forEach((key) => {
                    this.default_settings[key].context = true
                    this.default_settings[key].unit = "percent"
                    this.default_settings[key].icon = "circle"
                    this.default_settings[key].icon2 = "circle"

                })
                this.default_settings["impact"].context = true
                this.default_settings["impact"].unit = "absolute"
                this.default_settings["impact"].graph = "bar"
            } else if (this.intention === "convince") {
                ["impact", "significance", "context", "custom", "overall"].forEach((key) => {
                    this.default_settings[key].context = false
                    this.default_settings[key].unit = "natural_frequencies"
                    this.default_settings[key].icon = "emoticon-confused"
                    this.default_settings[key].icon2 = "emoticon"
                })
                this.default_settings["impact"].graph = "bar"
                this.default_settings["impact"].unit = "natural_frequencies"
            } else if (this.intention === "educate") {
                ["impact", "significance", "context", "custom", "overall"].forEach((key) => {
                    this.default_settings[key].context = true
                    this.default_settings[key].unit = "natural_frequencies"
                    this.default_settings[key].icon = "account"
                    this.default_settings[key].icon2 = "circle"
                })
                this.default_settings["impact"].graph = "multiPie"
                this.default_settings["impact"].unit = "natural_frequencies"
            }
        },
        /**
         * update context facts in the dashboard
         */
        update_dashboard_context() {
            let risk_factor_items = this.dashboard_items.filter(d => d.column.name !== useDataStore().target_column &&
                d.column.riskIncrease !== undefined)

            const options = risk_factor_items.map(item => ({
                "name": item.column.name + ": " + item.column.riskIncrease.name,
                "label": item.column.label + ": " + useDataStore().compute_group_name(item.column.options, item.column.type)
            }))
            const options_short = risk_factor_items.map(item => ({
                "name": item.column.name,
                "label": item.column.label
            }))

            const max_risk_multiplier = Math.max(...risk_factor_items.map(item => item.column.riskIncrease.risk_multiplier)) + 1
            this.dashboard_items.forEach(item => {
                if (item.column.name === "RiskIncrease") {
                    item.visList.forEach(vis => {
                        vis.data = risk_factor_items.map(item => ({
                            name: item.column.name + ": " + item.column.riskIncrease.name,
                            value: item.column.riskIncrease.risk_multiplier
                        })).filter(d => d.value !== null).sort((a, b) => b.value - a.value)
                        vis.range = [0, Math.round(max_risk_multiplier)]
                    })
                    item.column.options = options
                }
                if (item.column.name === "AbsoluteValues") {
                    item.visList.forEach(vis => {
                        vis.data = risk_factor_items.map(item => ({
                            name: item.column.name + ": " + item.column.riskIncrease.name,
                            value: item.column.riskIncrease.absolute_risk
                        })).sort((a, b) => b.value - a.value)
                    })
                    item.column.options = options
                }
                if (item.column.name === "Influence") {
                    item.visList.forEach(vis => {
                        vis.data = risk_factor_items.map(item => ({
                            name: item.column.name,
                            value: item.column['significance'].score['regression'].toFixed(2)
                        })).sort((a, b) => b.value - a.value)
                    })
                    item.column.options = options_short
                }

            })
        },
        /**
         * update similarity facts in the dashboard
         */
        update_dashboard_similarity() {
            this.dashboard_items.forEach(item => {
                item.visList.forEach(vis => {
                    if (vis.type === "similarity") {
                        let similar_dashboard_columns = useSimilarityStore().compute_similar_dashboard_columns(item.column)
                        vis.data = similar_dashboard_columns.map(item => ({
                            name: item.column.label,
                            value: item.similarity.toFixed(2)
                        }))
                    }
                })
            })
        },
        /**
         * check if column can be shown in recommendations
         */
        is_recommendation_column(column) {
            return (!this.dashboard_items.map(item => item.name).includes(column.name) &&
                column.name !== useDataStore().target_column &&
                !this.excluded_columns.includes(column.name))
        },
        /**
         * check if column is a currently considered confounding factor
         *
         * @param column
         */
        is_confounding_factor(column) {
            return (this.confounding_factors.includes(column.name))
        },
        /**
         * add column as confounding factor
         *
         * @param column
         */
        add_confounding_factor(column) {
            this.confounding_factors.push(column.name)
        },
        /**
         * remove column as confounding factor
         *
         * @param name
         */
        remove_confounding_factor(name) {
            this.confounding_factors = this.confounding_factors.filter(d => d !== name)
        },
        /**
         * exclude column
         */
        exclude_column(column) {
            this.excluded_columns.push(column.name)
            this.remove_dashboard_item(column.name)
            useRegressionStore().compute_score()
        },
        /**
         * restore column
         */
        restore_column(column) {
            this.excluded_columns = this.excluded_columns.filter(d => d !== column)
            useRegressionStore().compute_score()
        },
        /**
         * set new fact group
         */
        set_fact_group(column, visList) {
            let similar_dashboard_columns = useSimilarityStore().compute_similar_dashboard_columns(column)
            let additional_vis_list = useVisGeneratorStore().generate_additional_fact_visList(column, similar_dashboard_columns)

            this.current_fact_group = {
                'column': column,
                'visList': visList,
                'additional_vis_list': additional_vis_list,
                'similar_dashboard_columns': similar_dashboard_columns
            }
        },
        /**
         * get color
         */
        get_color(color_name) {
            if (!isNaN(color_name)) {
                return this.default_colors[this.intention].colors[color_name]
            }
            return color_name
        },
        /**
         * reset
         */
        reset() {
            this.dashboard_items = []
            this.current_fact_group = null
            this.current_fact_group_exports = []
            this.current_fact_index = null
            this.excluded_columns = []
            this.intention = "explore"
            this.default_settings = JSON.parse(JSON.stringify(default_settings_json))
            this.default_colors = {
                "explore":
                    {
                        "background": {color: "auto", stroke: "None"},
                        "colors": {"type": "scheme", "color": "#1302b5", "neutralColor": "#A8A8A8", "spread": 45, "global_spread": 100, "list": d3.quantize(d3.interpolateCool, 5).map(d => d3.color(d).hex())},
                        "text": "#181818",
                        "font_family": "inherit",
                    },
                "convince":
                    {
                        "background": {color: "white", stroke: "darkgray"},
                        "colors": {"type": "focus", "color": "#D3003B", "neutralColor": "#A8A8A8", "spread": 30, "global_spread": 0, "list": d3.quantize(d3.interpolateCool, 5).map(d => d3.color(d).hex())},
                        "text": "#181818",
                        "font_family": "inherit",
                    },
                "educate":
                    {
                        "background": {color: "auto", stroke: "None"},
                        "colors": {"type": "scheme", "color": "#40AD7B", "neutralColor": "#A8A8A8", "spread": 55, "global_spread": 100, "list": d3.quantize(d3.interpolateCool, 5).map(d => d3.color(d).hex())},
                        "text": "#181818",
                        "font_family": "inherit",
                    }
            }
        }
    }
})