<template>
  <!-- Choose Visualizations -->
    <v-dialog v-model="show" style="width:95%">
        <template v-slot:activator="{ props }">

            <v-btn v-bind="props" class="h-auto pa-4 ma-2" :variant="textButton? 'plain' : 'elevated'">
                More...
            </v-btn>

        </template>

        <v-card title="Risk Factors">

            <v-text-field class="mx-5 mt-2" label="Search" v-model="search" prepend-icon="mdi-magnify"></v-text-field>

            <div class="d-flex flex-wrap overflow-auto align-stretch mx-3" style="height:800px">
                <div v-for="column in cur_page_columns" v-bind:key="column"
                     class="relative">
                    <fact_group_preview class="pa-2" :vertical="true" style="height:500px"
                                        :visList="visGeneratorStore.generate_main_fact_visList()"
                                        :column="column"/>
                </div>
            </div>

            <v-pagination :length="page_num" v-model="page"></v-pagination>


            <v-card-actions class="w-100 bg-grey-lighten-2 pa-5">
                <div class="d-flex w-100">
                    <v-btn variant="elevated" class="px-9" @click="close">Close</v-btn>
                </div>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script>
import fact_group_preview from "@/components/fact_group_preview.vue";
import {useDashboardStore} from "@/stores/dashboardStore";
import {useDataStore} from "@/stores/dataStore";
import {useVisGeneratorStore} from "@/stores/visGeneratorStore";

export default {
    name: "settings_view",
    components: {
        fact_group_preview
    },
    props: [
        "textButton"
    ],
    setup() {
        const dashboardStore = useDashboardStore()
        const dataStore = useDataStore()
        const visGeneratorStore = useVisGeneratorStore()
        return {dataStore, dashboardStore, visGeneratorStore}
    },
    data() {
        return {
            show: false,
            page: 1,
            columns_per_page: 20,
            search: ""
        }
    },
    methods: {
        close() {
            this.show = false
        }
    },
    computed: {
        /**
         * returns the column_list, optionally filtered by search term
         *
         * @returns {never[]}
         */
        column_list() {
            let column_list = this.dataStore.column_list.filter(column => this.dashboardStore.is_recommendation_column(column))
            if (this.search !== "") {
                let lower_search = this.search.toLowerCase()
                column_list = column_list.filter(column => column.label.toLowerCase().includes(lower_search) ||
                  column.name.toLowerCase().includes(lower_search))
            }
            return column_list
        },
        /**
         * computes how many pages are required
         *
         * @returns {number}
         */
        page_num() {
            return Math.ceil(this.column_list.length / this.columns_per_page)
        },
        /**
         * returns the columns for the current page
         *
         * @returns {never[]}
         */
        cur_page_columns() {
            const start = (this.page-1)*this.page_num
            return this.column_list.slice(start, start + this.columns_per_page)
        }
    },
    watch: {
        show() {
            this.page = 1
        },
        page() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
}
</script>

<style scoped>

</style>