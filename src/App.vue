<template>
    <v-app>
        <start_overlay/>
        <fact_group_view v-if="this.dashboardStore.current_fact_group !== null"/>

        <v-card style="z-index: 5">
            <v-card-text class="d-flex mx-2 align-center">
                <v-app-bar-title>Raccoon</v-app-bar-title>
                <v-btn @click="this.dataStore.reset()" class="justify-end" variant="text">Reset</v-btn>
            </v-card-text>
        </v-card>

        <v-main>

            <!-- Dashboard -->
            <v-card class="pa-5 bg-blue-grey-lighten-5">

                <v-card-title>
                    <h2>
                        Your Dashboard
                        <dashboard_overlay text-button="true"/>
                        <export_overlay text-button="true"/>
                    </h2>
                </v-card-title>

                <div class="d-flex overflow-x-auto overflow-y-hidden align-stretch">
                    <div v-for="item in dashboardStore.dashboard_items" v-bind:key="item" class="d-flex flex-column pa-2">
                        <fact_group_preview :visList="item.visList" :column="item.column"
                                            style="height:400px" vertical="true"/>

                    </div>
                    <dashboard_overlay/>
                </div>
            </v-card>

            <!-- Settings & Tips -->
            <v-card class="pa-4">
                <div class="d-flex">
                    <settings_view/>

                    <div class="w-50 pl-5">
                        <tips-view/>
                    </div>
                </div>
            </v-card>

            <!-- General & Context -->
            <v-card class="pa-5 bg-blue-grey-lighten-5">

                <v-card-title>
                   <h2 class="mb-2">Recommendations</h2>
                </v-card-title>

                <div class="d-flex overflow-x-auto overflow-y-hidden align-stretch">
                    <div v-for="item in general_list" v-bind:key="item" class="pa-2">
                        <fact_group_preview style="height:250px" :visList="item.visList"
                                            :column="item.column"/>
                    </div>
                    <div v-for="item in context_list" v-bind:key="item" class="pa-2">
                        <fact_group_preview style="height:250px"  :visList="item.visList" :column="item.column"/>
                    </div>
                </div>

            </v-card>

            <!-- Risk Factors -->
            <v-card class="pa-5 bg-blue-grey-lighten-5">

                <v-card-title>
                    <div class="d-flex align-center">
                        Risk Factors
                        <all_risk_factor_overlay text-button="true"/>
                        <div class="flex-grow-1 d-flex justify-end">
                            <excluded_column_overlay/>
                            <v-select class="flex-grow-0" label="Sort by..." variant="solo-filled"
                                      v-model="scoreStore.score" @update:modelValue="scoreStore.sort_summaries()"
                                      :items="scoreStore.score_choices">
                                <template v-slot:item="{ item }">
                                        <v-btn class="d-block d-flex w-100 justify-start" variant="text" @click="scoreStore.score = item.value; scoreStore.sort_summaries()">
                                            {{ item.title }}
                                            <v-chip v-if="item.title === 'regression'" size="x-small" class="ml-2">default</v-chip>
                                        <v-tooltip activator="parent" location="left" content-class="bg-grey-darken-2">
                                            <span v-if="item.title === 'correlation'">
                                                Sort risk factors by their correlation with the outcome.
                                            </span>
                                            <span v-if="item.title === 'regression'">
                                                Sort risk factors by their ability to predict the outcome using linear regression,
                                                considering interaction terms.
                                            </span>
                                             <span v-if="item.title === 'odds_ratio'">
                                                Sort risk factors by the Prevalence Odds Ratio  calculated from the risk groups.
                                            </span>
                                             <span v-if="item.title === 'relative_risk'">
                                               Sort risk factors by their relative risk calculated from the risk groups.
                                            </span>
                                        </v-tooltip>
                                        </v-btn>
                                        <v-divider class="w-100"/>
                                </template>

                            </v-select>
                        </div>
                    </div>
                </v-card-title>

                <!-- interaction terms -->
                <div class="ml-3 mb-2" :style="scoreStore.score !== 'regression'? 'visibility:hidden' : ''">
                    Interaction terms:
                    <span v-for="name in dashboardStore.confounding_factors" v-bind:key="name" class="ml-2">
                        <v-chip variant="elevated" class="bg-shades-white">
                            {{dashboardStore.dashboard_items.find(d => d.column.name === name).column.label}}
                        </v-chip>
                    </span>
                    <confounding_factor_overlay />
                </div>

                <div v-if="regressionStore.performance_diff < 0.01">
                    <v-icon icon="mdi-alert"/>
                    there are no more impactful risk factors. Remaining frequency differences are explained by
                    correlations with currently selected factors.
                </div>

                <!-- Risk Factor Sheets -->
                <div class="d-flex overflow-x-auto overflow-y-hidden align-stretch">
                    <div v-for="item in risk_list" v-bind:key="item" class="pa-2">
                        <fact_group_preview style="height:400px"
                                            :visList="item.visList"
                                            :column="item.column" :vertical="true"/>
                    </div>

                    <all_risk_factor_overlay/>
                </div>

            </v-card>

        </v-main>

    </v-app>
</template>

<script>
import start_overlay from './components/start_overlay.vue'
import fact_group_preview from './components/fact_group_preview.vue'
import fact_group_view from './components/fact_group_view.vue'
import settings_view from "@/components/settings_view.vue";
import all_risk_factor_overlay from "@/components/all_risk_factor_overlay.vue";
import excluded_column_overlay from "@/components/excluded_column_overlay.vue";
import dashboard_overlay from "@/components/dashboard_overlay.vue";
import tipsView from "@/components/tipsView.vue";
import {useDashboardStore} from "@/stores/dashboardStore";
import {useDataStore} from "@/stores/dataStore";
import {useRegressionStore} from "@/stores/regressionStore";
import {useScoreStore} from "@/stores/scoreStore";
import {useVisGeneratorStore} from "@/stores/visGeneratorStore";
import confounding_factor_overlay from "@/components/confounding_factor_overlay.vue";
import export_overlay from "@/components/export_overlay.vue";


export default {
    components: {
        confounding_factor_overlay,
        excluded_column_overlay,
        fact_group_preview,
        start_overlay,
        fact_group_view,
        settings_view,
        all_risk_factor_overlay,
        dashboard_overlay,
        tipsView,
        export_overlay
    },
    setup() {
        const dataStore = useDataStore()
        const dashboardStore = useDashboardStore()
        const scoreStore = useScoreStore()
        const regressionStore = useRegressionStore()
        const visGeneratorStore = useVisGeneratorStore()
        return {dataStore, dashboardStore, regressionStore, scoreStore, visGeneratorStore}
    },
    data() {
        return {
            risk_list: [],
            general_list: [],
            context_list: []
        }
    },
    watch: {
        /**
         * computes a list of risk factors and their visualizations
         *
         * @returns {{column: *, visList: *}[]}
         */
        column_list: {
            handler: function () {
                this.recompute_recommendations()
            },
            deep: true
        },
        dashboard_items : {
            handler: function () {
                this.recompute_recommendations()
            },
            deep: true
        }
    },
    computed: {
        column_list: function () {
            return this.dataStore.column_list
        },
        dashboard_items: function () {
            return this.dashboardStore.dashboard_items
        },
    },
    methods: {
        /**
         * computes recommendations in the three categories risk_list (risk factors), context_list (context visualizations)
         * and general_list (general visualizations)
         */
        recompute_recommendations() {
            this.risk_list = this.column_list
                    .filter(d => this.dashboardStore.is_recommendation_column(d)).slice(0, 5).map(column => {
                        return {
                            column: column,
                            visList: this.visGeneratorStore.generate_main_fact_visList()
                        }
                    })
            this.context_list = this.visGeneratorStore.generate_context_fact_groups()
                .filter(d => !this.dashboard_items.map(i => i.name).includes(d.column.name))
            this.general_list = this.visGeneratorStore.generate_general_factGroups()
                .filter(d => !this.dashboard_items.map(i => i.name).includes(d.column.name))
        }
    }
}
</script>

<style lang="sass" scoped>

.v-card.on-hover
  cursor: pointer

</style>
