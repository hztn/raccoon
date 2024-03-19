import {defineStore} from 'pinia'
import * as d3 from "d3";
import {useDataStore} from "@/stores/dataStore";

export const useHelperStore = defineStore('helperStore', {
    state: () => ({}),
    actions: {
        /**
         * sorts options first by number, then by their string name
         *
         * @param a
         * @param b
         * @returns {number}
         */
        sort(a, b) {
            if (a.index !== undefined && b.index !== undefined) {
                return a.index - b.index
            }
            if (a.range !== undefined && b.range !== undefined) {
                return a.range[0] - b.range[0]
            }
            if (a.range !== undefined) {
                return -1
            }
            if (b.range !== undefined) {
                return 1
            }
            return a.name.localeCompare(b.name)
        },
        /**
         * calculates the maximum length of all options
         * @param options
         * @returns {*}
         */
        get_max_length(options) {
            return options.reduce((max, option) => Math.max(max, option.length), 0)
        },
        /**
         * replace variables in text with actual values
         *
         * @param text_array
         * @param column
         * @returns {any}
         */
        parse_text(text_array, column) {
            let new_text_array = JSON.parse(JSON.stringify(text_array))
            if (useDataStore().target) {
                new_text_array.forEach(d => {
                    d.text = d.text.replace("$rows", useDataStore().row_label)
                    d.text = d.text.replace("$outcome", useDataStore().target_label)
                    d.text = d.text.replace("$outcome_column", useDataStore().target.label)
                    d.text = d.text.replace("$column", column.label)
                    return d
                })

            }
            return new_text_array

        },

    }
})