<template>
  <!-- Choose Visualizations -->
    <v-dialog v-model="show" style="width:95%">
        <template v-slot:activator="{ props }">

            <v-btn v-bind="props" class="h-auto pa-4 ma-2" :variant="textButton? 'plain' : 'elevated'" >
                More...
            </v-btn>

        </template>

        <v-card title="Dashboard">
            <div class="d-flex flex-wrap overflow-auto align-stretch" style="height:800px">
                    <div v-for="item in dashboardStore.dashboard_items" v-bind:key="item" class="d-flex flex-column pa-2">
                        <fact_group_preview :visList="item.visList" :column="item.column"
                                            style="height:500px" vertical="true"/>
                    </div>
            </div>


            <v-card-actions class="w-100 bg-grey-lighten-2 pa-5">
                <div class="d-flex w-100">
                    <v-btn variant="elevated" class="px-9" @click="close">Close</v-btn>
                    <export_overlay/>
                </div>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script>
import fact_group_preview from "@/components/fact_group_preview.vue";
import export_overlay from "@/components/export_overlay.vue";
import {useDashboardStore} from "@/stores/dashboardStore";
import {useDataStore} from "@/stores/dataStore";

export default {
    name: "dashboard_overlay",
    components: {
        fact_group_preview, export_overlay
    },
    props: [
        "textButton"
    ],
    setup() {
        const dashboardStore = useDashboardStore()
        const dataStore = useDataStore()
        return {dataStore, dashboardStore}
    },
    data() {
        return {
            show: false,
        }
    },
    methods: {
        close() {
            this.show = false
        }
    }
}
</script>

<style scoped>

</style>