import {defineStore} from 'pinia'
import * as d3 from "d3";
import {useHelperStore} from './helperStore'
import {useScoreStore} from "./scoreStore";
import {useRegressionStore} from "@/stores/regressionStore";
import {useSimilarityStore} from "@/stores/similarityStore";
import {useDashboardStore} from "@/stores/dashboardStore";

export const useDataStore = defineStore('dataStore', {
    state: () => ({
        start: true,
        exclude_missing: true,
        csv: null,
        min_bin_size: 0,
        column_names: [],
        target_column: null,
        target_all_options: [],
        target_type: null,
        target_option: null,
        target_operator: null,
        target_value: null,
        target: null,
        target_label: "",
        row_label: "people",
        column_list: []
    }),
    actions: {
        /**
         * calculates column per variable
         */
        calc_column_list() {
            this.column_list = []
            let scoreStore = useScoreStore()

            this.column_names.forEach(name => {
                let options = [...new Set(this.csv.map(d => d[name]))]
                options = options.map(o => ({"name": o, "label": o}))
                //only continue if there are less than 10 options to make sure it is categorical or ordinal
                let column = {}
                if (options.length <= 10) {
                    options = options.sort(useHelperStore().sort)
                    options.forEach((d,i) => d.index = i)
                    column = {
                        name: name,
                        label: name,
                        type: "categorical",
                        options: options,
                        data: this.csv.map(d => d[name]),
                        //how often each option occurs
                        occurrence: Object.fromEntries(new Map(options.map(d => [d.name, 0]))),
                        //how often each option occurs together with the target option
                        occurrence_target_option: Object.fromEntries(new Map(options.map(d => [d.name, 0]))),
                        color: this.get_rand_color()
                    }
                    this.csv.forEach(d => column.occurrence[d[name]]++)
                    this.filter_for_target_option(this.csv).forEach(d => column.occurrence_target_option[d[name]]++)
                } else {
                    let options_num = options.filter(d => !isNaN(d.name) && d.name !== "")
                    let options_other = options.filter(d => isNaN(d.name) || d.name === "")

                    //continuous variables
                    if (options_num.length > 5) {
                        //calculate bins
                        let options_binned_num = this.calculate_pretty_bins(options_num)
                        let options_bin = [...options_binned_num, ...options_other]
                        options_bin = options_bin.sort(useHelperStore().sort)
                        options_bin.forEach((d,i) => {if (d.range === undefined) { d.index = i}})

                        column = {
                            name: name,
                            label: name,
                            type: "continuous",
                            options: options_bin,
                            data: this.csv.map(d => d[name]),
                            data_binned: this.csv.map(d => this.find_bin(d[name], options_bin)),
                            data_with_target_option: this.filter_for_target_option(this.csv).map(d => d[name]).filter(d => !isNaN(d) && d !== ""),
                            data_with_target_option_binned: this.filter_for_target_option(this.csv).map(d => this.find_bin(d[name], options_bin)),
                            //how often each option occurs
                            occurrence: Object.fromEntries(new Map(options_bin.map(d => [d.name, 0]))),
                            //how often each option occurs together with the target option
                            occurrence_target_option: Object.fromEntries(new Map(options_bin.map(d => [d.name, 0]))),
                            color: this.get_rand_color()
                        }

                        column.data_binned.forEach(d => column.occurrence[d]++)
                        column.data_with_target_option_binned.forEach(d => column.occurrence_target_option[d]++)
                        column = this.bin_ends(column, this.min_bin_size)
                        column.data_binned = this.csv.map(d => this.find_bin(d[name], column.options))
                    }
                }

                if (Object.keys(column).length > 0) {
                    column = this.column_exclude_missing(column)

                    //percentage how often each option occurs together with the target option
                    column.percent_target_option = this.divide_maps(column.occurrence_target_option, column.occurrence)

                    //total values
                    column.total = {
                        occurrence: d3.sum(Object.values(column.occurrence)),
                        occurrence_target_option: d3.sum(Object.values(column.occurrence_target_option))
                    }
                    column.total.percent_target_option = column.total.occurrence_target_option / column.total.occurrence

                    this.compute_initial_risk_groups(column)
                    this.compute_risk_increase(column)

                    this.column_list.push(column)
                }
            })

            //go through summaries again to compute correlation with target
            let target_column = this.column_list.find(d => d.name === this.target_column)
            this.target = target_column
            this.column_list.forEach(column => {
                column.correlation_with_target = useSimilarityStore().compute_similarity(target_column, column)
                column.significance = scoreStore.compute_significance_score(column)

            })

            //sort by significance_score
            scoreStore.sort_summaries()

            useRegressionStore().prepare_data()
            useRegressionStore().compute_score()

        },
        /**
         * filters table for only rows with target option selected
         *
         * @param d
         * @returns {*}
         */
        filter_for_target_option(d) {
            if (this.target_type === "categorical") {
                return d.filter(d => d[this.target_column] === this.target_option)
            }
            else if (this.target_type === "continuous") {
                if (this.target_operator === "=") {
                    return d.filter(d => d[this.target_column] === this.target_value)
                }
                else if (this.target_operator === ">") {
                    return d.filter(d => d[this.target_column] > this.target_value)
                }
                else if (this.target_operator === "<") {
                    return d.filter(d => d[this.target_column] < this.target_value)
                }
            }
            else {
                return false
            }
        },
        /**
         * divides values of two maps per key
         *
         * @param a
         * @param b
         * @returns {{}}
         */
        divide_maps(a, b) {
            let result = {}
            Object.keys(a).forEach(key => {
                result[key] = a[key] / b[key]
            })
            return result
        },
        /**
         * calculates pretty extents for continuous columns.
         * Favors step sizes that are powers of 5 and ranges that are multiples of 5
         *
         * @param options
         * @returns {(number|number)[]}
         */
        calculate_pretty_bins(options) {
            const steps = 4
            //calculate exact number of bins given the step size
            options = options.map(d => +d.name).sort()
            let extent = d3.extent(options)
            let p_upper = d3.quantile(options, 0.95)
            let p_lower = d3.quantile(options, 0.05)
            let stepsize = (p_upper - p_lower) / steps

            //make step size more pretty
            let pretty_stepsize_10 = Math.pow(10, Math.floor(Math.log10(stepsize)))
            let float5 = 5 * pretty_stepsize_10
            let pretty_stepsize = Math.round(stepsize / float5) * float5
            if (pretty_stepsize === 0) pretty_stepsize = float5/5

            //calculate new bins
            let pretty_min = Math.floor(extent[0] / pretty_stepsize) * pretty_stepsize
            let pretty_max = Math.ceil(extent[1] / pretty_stepsize) * pretty_stepsize

            let logStep = Math.max(0, -Math.floor(Math.log10(pretty_stepsize)))
            let bins = []
            for (let i = pretty_min; i <= pretty_max; i += pretty_stepsize) {
                let i_min = i.toFixed(logStep)
                let i_max = (i + pretty_stepsize).toFixed(logStep)
                bins.push({
                    "name": i_min + "-" + i_max,
                    "label": i_min + "-" + i_max,
                    "range": [i_min, i_max]
                })
            }

            return bins
        },
        /**
         * bins continuous columns at start and end
         *
         * @param column
         * @param min_bin_size
         * @returns {*}
         */
        bin_ends(column, min_bin_size) {
            let options_num = column.options
            let last_index_num = options_num.filter(a => a.range !== undefined).length - 1

            //iterate through options_num from behind
            let i = last_index_num
            let occurrence_sum = 0
            let occurrence_target_option_sum = 0
            let name_end = options_num[i].range[1]
            let name_start = ""
            while (occurrence_sum < min_bin_size && i > 0) {
                occurrence_sum += column['occurrence'][options_num[i].name]
                occurrence_target_option_sum += column['occurrence_target_option'][options_num[i].name]
                name_start = options_num[i].range[0]
                delete column.occurrence[options_num[i].name]
                delete column.occurrence_target_option[options_num[i].name]
                options_num.splice(i, 1)
                i--
            }
            if (i < last_index_num) {
                column.occurrence[name_start + "-" + name_end] = occurrence_sum
                column.occurrence_target_option[name_start + "-" + name_end] = occurrence_target_option_sum
                options_num.push({
                    "name": name_start + "-" + name_end,
                    "label": "≥" + name_start,
                    "range": [name_start, name_end]
                })
            }

            //iterate through options_num from front
            last_index_num = i + 1
            i = 0
            occurrence_sum = 0
            occurrence_target_option_sum = 0
            name_start = options_num[i].range[0]
            name_end = ""
            while (occurrence_sum < min_bin_size && i < last_index_num) {
                occurrence_sum += column['occurrence'][options_num[i].name]
                occurrence_target_option_sum += column['occurrence_target_option'][options_num[i].name]
                name_end = options_num[i].range[1]
                delete column.occurrence[options_num[i].name]
                delete column.occurrence_target_option[options_num[i].name]
                i++
            }
            options_num.splice(0, i)

            if (i > 0) {
                column.occurrence[name_start + "-" + name_end] = occurrence_sum
                column.occurrence_target_option[name_start + "-" + name_end] = occurrence_target_option_sum
                options_num.push({
                    "name": name_start + "-" + name_end,
                    "label": "<" + name_end,
                    "range": [name_start, name_end]
                })
            }

            column.options = options_num.sort(useHelperStore().sort)
            return column
        },
        /**
         * if missing values should be excluded, remove them from the column
         *
         * @param column
         * @returns {*}
         */
        column_exclude_missing(column) {
            //exclude missing values
            if (this.exclude_missing) {
                column.options = column.options.filter(d => d.name !== "" && d.name !== "NA")
                delete column.occurrence[""]
                delete column.occurrence_target_option[""]
                delete column.occurrence["NA"]
                delete column.occurrence_target_option["NA"]
            }
            return column
        },
        /**
         * compute initial risk groups for a column
         *
         * @param column
         */
        compute_initial_risk_groups(column) {
            //calculate risk boundary differencing between risk factor and not risk factor
            const percent_range = d3.extent(Object.values(column.percent_target_option))
            const split_percent = percent_range[0] + (percent_range[1] - percent_range[0]) / 2
            const groups_true = Object.entries(column.percent_target_option).filter(d => d[1] >= split_percent).map(d => d[0])

            column.options.forEach(d => {
                d.risk_group = groups_true.includes(d.name)
            })

        },
        /**
         * binary percent risk increase when in specific groups
         *
         * @param column
         * @returns {{risk_difference: string, risk_factor_groups: string}}
         */
        compute_risk_increase(column) {

            //compute groups below risk boundary
            const groups_false = column.options.filter(d => d.risk_group === false).map(d => d.name)
            const groups_below_occurrence_sum = groups_false.reduce((a, b) => a + column.occurrence[b], 0)
            const groups_below_target_option_occurrence_sum = groups_false.reduce((a, b) => a + column.occurrence_target_option[b], 0)
            const below_percentage = groups_below_target_option_occurrence_sum / groups_below_occurrence_sum

            //compute groups above risk boundary
            const groups_true = column.options.filter(d => d.risk_group === true).map(d => d.name)
            const groups_above_occurrence_sum = groups_true.reduce((a, b) => a + column.occurrence[b], 0)
            const groups_above_target_option_occurrence_sum = groups_true.reduce((a, b) => a + column.occurrence_target_option[b], 0)
            const above_percentage = groups_above_target_option_occurrence_sum / groups_above_occurrence_sum

            //create name of risk factor
            const name_above = this.compute_group_name(column.options, column.type)

            //calculate metrics to compare risk factors
            const risk_multiplier = below_percentage === 0 ? null : (above_percentage / below_percentage).toFixed(1)
            const risk_difference = (above_percentage - below_percentage).toFixed(2)
            const risk_min = d3.min(groups_true.map(a => column.percent_target_option[a]))

            //compute 2x2 table for POR and PRR
            const a = groups_above_target_option_occurrence_sum
            const b = groups_above_occurrence_sum - groups_above_target_option_occurrence_sum
            const c = groups_below_target_option_occurrence_sum
            const d = groups_below_occurrence_sum - groups_below_target_option_occurrence_sum

            const odds_ratio = (a * d) / (b * c) //POR
            const relative_risk = (a / (a + c)) / (b / (b + d)) //PRR

            column.riskIncrease = {
                risk_factor_groups: groups_true,
                name: name_above,
                risk_difference: risk_difference,
                risk_multiplier: risk_multiplier,
                risk_min: risk_min,
                odds_ratio: odds_ratio.toFixed(2),
                relative_risk: relative_risk.toFixed(2),
                absolute_risk: above_percentage.toFixed(3),
                occurrence_sum: groups_above_occurrence_sum
            }
        },
        /**
         * computes the name of a group
         */
        compute_group_name(options, type) {
            let group_options = options.filter(d => d.risk_group === true)
            group_options = JSON.parse(JSON.stringify(group_options))
            group_options = group_options.sort(useHelperStore().sort)

            if (type === "continuous") {
                let min = d3.min(options.filter(d => d.range !== undefined).map(d => +d.range[0]))
                let max = d3.max(options.filter(d => d.range !== undefined).map(d => +d.range[1]))

                //combine groups
                let i = 0
                while (i < group_options.length - 1) {
                    if (group_options[i].range !== undefined && group_options[i + 1].range !== undefined &&
                        group_options[i].range[1] === group_options[i + 1].range[0]) {
                        group_options[i].range[1] = group_options[i + 1].range[1]
                        group_options.splice(i + 1, 1)
                    } else {
                        i++
                    }
                }

                //update names, labels
                group_options = group_options.filter(d => d.range !== undefined).map(d => {
                    d.name = d.range[0] + "-" + d.range[1]
                    d.label = (+d.range[0] === min) ? "<" + d.range[1] :
                        (+d.range[1] === max) ? "≥" + d.range[0] :
                            d.range[0] + "-" + d.range[1]
                    return d
                })

            }

            //combine labels with comma and last one with or
            if (group_options.length === 1) {
                return group_options.reduce((a, b) => a + ", " + b.label, "").substring(2) //remove first comma
            }
            else {
                //get last one
                let last = group_options[group_options.length - 1]
                let remaining_options = group_options.slice(0, group_options.length - 1)
                return remaining_options.reduce((a, b) => a + ", " + b.label, "").substring(2) +  " or " + last.label
            }

        },
        /**
         * recalculates a variable summaries when the option bins are changed. For now, people that do not fit in any of
         * the current bins are just ignored. This will be changed in the future.
         *
         * @param column
         * @returns {*}
         */
        recalculate_column_after_option_change(column) {
            //only continue if there are less than 10 options to make sure it is categorical or ordinal
            if (column.type === "categorical") {
                //not implemented yet
                return column

            }
            if (column.type === "continuous") {

                //update names
                if (column.type === "continuous") {
                    column.options.filter(d => d.range !== undefined).forEach(d => d.name = d.range[0] + "-" + d.range[1])
                    column.options.filter(d => d.range !== undefined).forEach((d, i) => {
                        if (i === 0) {
                            d.label = "<" + d.range[1]
                        } else if (i === column.options.length - 1) {
                            d.label = "≥" + d.range[0]
                        } else {
                            d.label = d.name
                        }
                    })
                }

                column.occurrence = Object.fromEntries(new Map(column.options.map(d => [d.name, 0])))
                column.occurrence_target_option = Object.fromEntries(new Map(column.options.map(d => [d.name, 0])))
                column.data_binned = column.data.map(d => this.find_bin(d, column.options))
                column.data_binned.forEach(d => column.occurrence[d]++)
                column.data_with_target_option_binned = column.data_with_target_option.map(d => this.find_bin(d, column.options))
                column.data_with_target_option_binned.forEach(d => column.occurrence_target_option[d]++)

                //for now: just exclude null values
                delete column.occurrence[null]
                delete column.occurrence_target_option[null]

                column.percent_target_option = this.divide_maps(column.occurrence_target_option, column.occurrence)


                column = this.column_exclude_missing(column)
                column.significance = useScoreStore().compute_significance_score(column)
                this.compute_risk_increase(column)

                return column
            }

        },
        /**
         * finds the option bin for a value
         *
         * @param value
         * @param options
         * @returns {*|null}
         */
        find_bin(value, options) {
            const option = options.find(d => d.range !== undefined ? +value >= +d.range[0] && +value < +d.range[1] : d.name === value)
            return option ? option.name : null
        },
        /**
         * get random color offset
         */
        get_rand_color() {
          return {type: "standard", value: Math.random()-0.5}
        },
        /**
         * resets all variables to their initial state
         */
        reset() {
            this.start = true
            this.exclude_missing = true
            this.min_bin_size = 0,
            this.csv = null
            this.column_names = []
            this.target_column = null
            this.target_all_options = []
            this.target_option = null
            this.target_label = ""
            this.target = null
            this.row_label = "people"
            this.column_list = []

            useRegressionStore().reset()
            useDashboardStore().reset()

        }
    }
})
