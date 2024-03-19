<template>
  <!-- visualization preview -->
    <div class="d-flex flex-column w-100">
        <v-hover v-slot="{ isHovering, props }">
            <div class="w-100 h-100 d-flex flex-column" v-bind="props">
                <v-card :elevation="isHovering ? 16 : 2"
                        :class="{ 'on-hover': isHovering}" class="w-100 h-100" style="z-index: 5"
                        @click="show_fact_group_view" >

                    <!--box shadow -->
                    <div class="position-absolute top-0 left-0 w-100 h-100 overflow-hidden"
                         style="box-shadow: inset 0 -2em 4em rgba(255, 255, 255, 1); min-height:400px"></div>

                    <h4 class="ml-4 mt-4 d-flex flex-column align-center w-100">{{ column.label }}</h4>
                    <!-- risk factors -->
                    <span v-if="column.riskIncrease" class="ml-4 d-flex flex-column align-center w-100">
                        {{column.riskIncrease.name}}
                    </span>

                    <!-- hint when column is excluded -->
                    <div v-if="dashboardStore.excluded_columns.includes(column.name)"
                         class="ml-4 mt-4 d-flex justify-center w-100 text-yellow-darken-4">
                        <v-icon icon="mdi-alert" class="mr-2"/> [Excluded from risk factor calculations]
                    </div>

                    <!--visualization preview -->
                    <div class="pa-2 d-flex align-center" :class="{ 'flex-column': vertical }">
                        <div v-for="vis in visList" v-bind:key="vis">
                            <vis_parser :vis="vis" :column="column" :width="250" :preview="true"/>
                        </div>
                    </div>

                </v-card>
                <div v-if="isHovering"  class="d-flex w-100" style="z-index: 3">
                    <v-btn variant="tonal" class="bg-grey-lighten-2 flex-grow-1" @click="move_item">
                        {{dashboardStore.dashboard_items.find(d => d.name === column.name) !== undefined ? "Remove" : "Add"}}
                    </v-btn>
                </div>
            </div>
        </v-hover>
    </div>
</template>

<script>
import vis_parser from "@/components/visualization/vis_parser.vue";
import {useDashboardStore} from "@/stores/dashboardStore";
import {useDataStore} from "@/stores/dataStore";

export default {
    name: "fact_group",
    components: {vis_parser},
    props: [
        "visList",
        "column",
        "vertical",
        "height",
        "width"
    ],
    setup() {
        const dashboardStore = useDashboardStore()
        const dataStore = useDataStore()
        return {dataStore, dashboardStore}
    },
    methods: {
        /**
         * shows the fact group view for the selected fact group
         */
        show_fact_group_view() {
            this.dashboardStore.set_fact_group(this.column, this.visList)
        },

        /**
         * adds or removes the fact group from the dashboard
         */
        move_item() {
            if (this.dashboardStore.dashboard_items.find(d => d.name === this.column.name) !== undefined) {
                this.dashboardStore.remove_dashboard_item(this.column.name)
            } else {
                this.dashboardStore.add_dashboard_item(this.column, this.visList)
            }
        }

    }
}
</script>

<style lang="sass" scoped>
.v-card.on-hover
  cursor: pointer

</style>