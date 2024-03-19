<template>
    <v-dialog v-model="show" :scrim="false" width="auto">
        <template v-slot:activator="{ props }">

            <v-btn v-bind="props" class="h-auto px-4 mx-2" variant="plain" prepend-icon="mdi-pencil">
                change
            </v-btn>

        </template>
        <v-card>
            <v-card-title class="mx-3">interaction terms</v-card-title>
            <v-card-text>
                <div class="d-flex ml-2">
                    <v-icon class="mr-2">mdi-help-circle-outline</v-icon>
                    <span>
                    Raccoon will consider all selected risk factors of the dashboard as interaction terms. <br>
                    Risk factor suggestions will consider if the observed
                    risk increase can already be explained by the interaction terms. <br>
                    Eg. Obesity increases the risk of diabetes.
                    However, this increase is already explained by the correlation between obesity and bmi.
                    </span>
                </div>
                <div v-for="item in confounding_factors" v-bind:key="item">
                    <v-checkbox v-model="item.factor" :label="item.column.label" @change="factor_changed(item)" hide-details/>
                </div>
            </v-card-text>

        <v-card-actions>
            <v-btn @click="show = false">Close</v-btn>
        </v-card-actions>

        </v-card>
    </v-dialog>
</template>

<script>
import {useDashboardStore} from "@/stores/dashboardStore";
import {useRegressionStore} from "@/stores/regressionStore";
import {useDataStore} from "@/stores/dataStore";

export default {
    name: "confounding_factor_overlay",
    setup() {
        const dashboardStore = useDashboardStore()
        const regressionStore = useRegressionStore()
        const dataStore = useDataStore()
        return {dashboardStore, regressionStore, dataStore}
    },
    data() {
        return {
            show: false,
            confounding_factors: []
        }
    },
    mounted() {
        this.update_factors()
    },
    watch: {
        show() {
            this.update_factors()
        }
    },
    methods: {
        /**
         * Update the list of interaction terms
         */
        update_factors() {
            this.confounding_factors = this.dashboardStore.dashboard_items
                .filter(item => item.name !== this.dataStore.target.name)
                .filter(item => this.dataStore.column_list.find(c => c.name ===item.name))
                .map(item => ({
                name: item.column.label,
                column: item.column,
                factor: this.dashboardStore.is_confounding_factor(item.column)
            }))
        },
        /**
         * when the user clicks on a checkbox, the corresponding column is added or removed from the list of interaction terms
         *
         * @param item
         */
        factor_changed(item) {
            if (item.factor === true) {
                this.dashboardStore.add_confounding_factor(item.column)
            } else {
                this.dashboardStore.remove_confounding_factor(item.column.name)
            }
            this.regressionStore.compute_score()
        }
    }

}
</script>

<style scoped>

</style>