<template>
    <h3> Tips </h3>
    <ul class="pl-5">
        <li v-for="tip in tipList" v-bind:key="tip">{{tip}}</li>
    </ul>
</template>

<script>
import {useDataStore} from '@/stores/dataStore'
import {useDashboardStore} from "@/stores/dashboardStore";
import {useSimilarityStore} from "@/stores/similarityStore";

export default {
    setup() {
        const dataStore = useDataStore()
        const dashboardStore = useDashboardStore()
        const similarityStore = useSimilarityStore()
        return {dataStore, dashboardStore, similarityStore}
    },
    data() {
        return {}
    },
    methods: {
        /**
         * Returns true if the attribute value is inconsistent between all visualizations of that type
         * @param type
         * @param attribute
         * @returns {boolean}
         */
        isInconsistent(type, attribute) {
            let customGraphs = this.dashboardStore.dashboard_items
                .map(d => [d.visList.filter(v => v.type=== type).map(v => v[attribute])])
                .flat(2)
            let fullLength = customGraphs.length
            let otherGraphLength = customGraphs
                .filter(d => d !== undefined && d !== null && JSON.stringify(d) !== JSON.stringify((this.dashboardStore.default_settings[type][attribute])))
                .length

            return otherGraphLength > 0 && fullLength > otherGraphLength
        }
    },
    computed: {
        /**
         * Returns a list of tips
         *
         * @returns {*[]}
         */
        tipList: function() {
            let tipList = []
            if (this.dashboardStore.dashboard_items.length < 3) {
                tipList.push("Add fact groups from below!")
            }

            //pie graphs
            if ((this.dashboardStore.dashboard_items.filter(d => d.visList.filter(v => v.graph === "pie" || v.graph === "multiPie").length > 0).length > 0)
            || Object.values(this.dashboardStore.default_settings).filter(d => d.graph === "pie" || d.graph === "multiPie").length > 0) {
                tipList.push("Pie graphs are good for overview, but worse for detail knowledge")
            }

            //nominators
            if ((this.dashboardStore.dashboard_items.filter(d => d.visList.filter(v => v.unit === false).length > 0).length > 0)
            || Object.values(this.dashboardStore.default_settings).filter(d => d.unit === false).length > 0) {
                tipList.push("Not showing the denominator is better for changing behavior, but worse for accurate understanding")
            }

            //inconsistency
            //graph
            this.isInconsistent("significance", "graph")? tipList.push("Significance facts have inconsistent graph types") : null
            this.isInconsistent("impact", "graph")? tipList.push("Impact facts have inconsistent graph types") : null
            //unit
            this.isInconsistent("significance", "unit")? tipList.push("Significance facts have inconsistent units") : null
            this.isInconsistent("impact", "unit")? tipList.push("Impact facts have inconsistent units") : null
            //context
            this.isInconsistent("significance", "context")? tipList.push("Significance facts have inconsistent contexts") : null
            this.isInconsistent("impact", "context")? tipList.push("Impact facts have inconsistent contexts") : null
            //axis
            this.isInconsistent("significance", "axis")? tipList.push("Significance facts have inconsistent axes") : null
            this.isInconsistent("impact", "axis")? tipList.push("Impact facts have inconsistent axes") : null
            //title
            this.isInconsistent("significance", "title")? tipList.push("Significance facts have inconsistent titles") : null
            this.isInconsistent("impact", "title")? tipList.push("Impact facts have inconsistent titles") : null

            //high correlations between dashboard columns
            let similarTuples = []
            this.dashboardStore.dashboard_items.forEach(item => {
                let similar = this.similarityStore.compute_similar_dashboard_columns(item.column)
                    similar
                        .filter(s => !similarTuples.find(d => d[0] === s.column.name && d[1] === item.column.name))
                        .forEach(s => similarTuples.push([item.column.name, s.column.name, s.similarity]))
            })
            Array.from(similarTuples).forEach(t => {
                tipList.push(t[0] + " and " + t[1] + " are highly correlated (" + t[2].toFixed(2) + ")")
            })

            return tipList
        }
    }
}
</script>
