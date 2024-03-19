<template>
    <v-dialog v-model="dataStore.start">
        <v-card class="flex mx-auto w-75">

            <v-card-title>RACCOON - Risk Factor Communication</v-card-title>

            <v-card-text>
                <div style="height:400px" class="d-flex flex-column align-center w-100">
                    <!-- Page 0: Dataset selection -->
                    <div v-if="page === 0" class="w-100 mt-6">
                        <h1 class="d-flex justify-center"> Choose dataset</h1>

                        <!-- help -->
                        <div class="d-flex justify-center">
                            <v-dialog activator="parent" style="width: 700px">
                                <template v-slot:activator="{ props }">
                                    <v-btn v-bind="props" prepend-icon="mdi-help-circle-outline" variant="plain"> help
                                    </v-btn>
                                </template>
                                <v-card title="Help">
                                    <v-card-text>
                                        <div class="mb-2">
                                            <b>Choose a csv file</b> from your local file system.
                                            The dataset will remain on your computer and will not be uploaded to any server.

                                        </div>

                                        <div class="mb-2">
                                            Alternatively, you can <b>load the example dataset</b> about risk factors for diabetes containing a sample
                                            of 5000 participants and 15 (preprocessed) columns
                                            from the <a href="https://www.cdc.gov/brfss/index.html" target="_blank">
                                            BRFSS survey</a>.
                                        </div>

                                        <div class="mb-2">
                                            Find the example csv file
                                            <a href="https://raw.githubusercontent.com/akleinau/raccoon/main/examples/diabetes_sample.csv"
                                               target="_blank">here</a>
                                        </div>
                                    </v-card-text>

                                </v-card>
                            </v-dialog>
                        </div>

                        <!-- dataset selection -->
                        <div class="d-flex w-100 mx-3 align-center justify-center">
                            <div class="mt-3 w-50">
                                <v-file-input label="Choose CSV file" class="px-5" v-model="files"
                                              accept=".csv"
                                              @update:modelValue="uploaded"></v-file-input>
                            </div>
                            or
                            <v-btn @click="load_example" variant="tonal" class="mx-5">load example</v-btn>
                        </div>

                    </div>

                    <!-- Page 1: Target selection -->
                    <div v-if="page === 1">
                        <h1 class="d-flex justify-center mt-6"> Choose outcome</h1>

                        <!-- help -->
                        <div class="d-flex justify-center">
                            <v-dialog activator="parent" style="width: 700px">
                                <template v-slot:activator="{ props }">
                                    <v-btn v-bind="props" prepend-icon="mdi-help-circle-outline" variant="plain"> help
                                    </v-btn>
                                </template>
                                <v-card title="Help">
                                    <v-card-text>
                                        <div class="mb-2">
                                            Your outcome is the disease or hazard for which you want to
                                            compute risk factors.
                                        </div>
                                        <div class="mb-2">
                                            First select as <b>outcome column</b> a column of your dataset.
                                        </div>
                                        <div class="mb-2">
                                            Then select as <b>outcome option</b> one of the values that the column contains.
                                        </div>
                                        <div class="mb-2">
                                            Afterwards you can customize the <b>label</b> to improve readability.
                                        </div>
                                    </v-card-text>

                                </v-card>
                            </v-dialog>
                        </div>


                        <div v-if="dataStore.column_names.length !== 0" class="mt-3">
                            <v-autocomplete v-model="dataStore.target_column" class="px-5" label="Select outcome column"
                                            :items="dataStore.column_names" style="min-width: 500px"
                                            @update:modelValue="target_selected"/>
                        </div>

                        <div v-if="dataStore.target_type === 'categorical'">
                            <v-autocomplete v-model="dataStore.target_option" class="px-5" label="Select outcome option"
                                            :items="dataStore.target_all_options"
                                            @update:modelValue="target_option_selected"/>
                        </div>
                        <div v-if="dataStore.target_type === 'continuous'" class="d-flex px-5">
                            <v-select v-model="dataStore.target_operator" :items="['=','>','<']" class="mr-2"
                                      @update:modelValue="target_option_selected" label="operator" />
                            <v-text-field v-model="dataStore.target_value" type="number"
                                          @update:modelValue="target_option_selected" label="number" />
                        </div>
                        <div v-if="dataStore.target_type === 'unknown'">
                            Please select another variable.
                        </div>
                        <div class="px-5 pb-5 pt-3" v-if="dataStore.target_option || (dataStore.target_operator && dataStore.target_value)">
                            <div>Customize outcome label:</div>
                            <v-text-field v-if="dataStore.target_type === 'categorical'" v-model="dataStore.target_label"
                                          :hint="'eg. ' + dataStore.target_column + ':' + dataStore.target_option"
                            ></v-text-field>
                            <v-text-field v-if="dataStore.target_type === 'continuous'" v-model="dataStore.target_label"
                                          :hint="'eg. ' + dataStore.target_column + ':' + dataStore.target_operator + dataStore.target_value"
                            ></v-text-field>
                            <i> Example: "The risk of <span class="text-primary">
                                {{ dataStore.target_label }} </span> is X%."
                            </i>
                        </div>
                    </div>

                    <!-- Page 2: Additional Choices -->
                    <div v-if="page === 2">
                        <!-- Intention -->
                        <div class="px-5 pb-5">
                            <h1 class="d-flex justify-center mb-5 mt-6"> I want to... </h1>
                            <v-btn-toggle v-model="dashboardStore.intention" class="d-flex justify-center" mandatory>
                                <v-btn value="explore">
                                    <v-icon class="mx-1" size="x-large">mdi-map-search</v-icon>
                                    Explore
                                </v-btn>

                                <v-btn value="convince">
                                    <v-icon class="mx-1" size="x-large">mdi-alert-octagram-outline</v-icon>
                                    Convince
                                </v-btn>

                                <v-btn value="educate">
                                    <v-icon class="mx-1" size="x-large">mdi-school</v-icon>
                                    Educate
                                </v-btn>
                            </v-btn-toggle>
                            <div style="width:800px" class="mt-1 d-flex justify-center">
                                <div v-if="dashboardStore.intention === 'explore'">
                                    Explore the data. Showing detailed information about the dataset.
                                </div>
                                <div v-if="dashboardStore.intention === 'convince'">
                                    Convince the public about the risks associated with the risk factors.
                                </div>
                                <div v-if="dashboardStore.intention === 'educate'">
                                    Educate the public. Showing simple, easily understandable visualizations.
                                </div>

                            </div>
                        </div>

                        <!-- Additional options -->
                        <div class="px-5 pt-2 d-flex justify-center">
                            <v-expansion-panels style="width:800px">
                                <v-expansion-panel title="Additional Options">
                                    <v-expansion-panel-text>
                                        <div class="d-flex">
                                            <v-checkbox class="pr-2" label="exclude missing values" hide-details
                                                    v-model="dataStore.exclude_missing"></v-checkbox>
                                            <v-text-field label="rows equal" v-model="dataStore.row_label" hide-details></v-text-field>
                                        </div>
                                        <v-checkbox label="only consider (randomly selected) subset of observations" hide-details
                                                    v-model="subset"></v-checkbox>
                                        <div class="d-flex justify-end">
                                            <v-text-field v-if="subset" label="Size of subset" v-model="row_number" type="number"></v-text-field>
                                            <div class="px-2 text-grey-darken-1">full dataset size: {{this.dataStore.csv.length}}</div>
                                        </div>
                                    </v-expansion-panel-text>
                                </v-expansion-panel>
                            </v-expansion-panels>
                        </div>
                    </div>

                </div>

                <v-card-actions class="w-100 pa-5">
                    <!-- page 0 -->
                    <div class="w-100 d-flex justify-end px-5" v-if="page === 0">
                        <v-btn @click="page++" v-if="dataStore.column_names.length !== 0"
                               variant="outlined"> Next
                        </v-btn>
                    </div>
                    <!-- page 1 -->
                    <div class="w-100 d-flex justify-space-between px-5" v-if="page === 1">
                        <v-btn @click="page--" variant="outlined"> Prev</v-btn>
                        <v-btn @click="page++" v-if="dataStore.target_option !== null || (dataStore.target_operator && dataStore.target_value)"
                               variant="outlined"> Next
                        </v-btn>
                    </div>
                    <!-- page 2 -->
                    <div class="w-100 d-flex justify-space-between px-5" v-if="page === 2">
                        <v-btn @click="page--" variant="outlined"> Prev</v-btn>
                        <v-btn class="d-flex font-weight-bold" style="font-size:1.5rem" color="primary"
                               @click="visualize()">Calculate
                        </v-btn>
                    </div>
                </v-card-actions>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>

<script>
import * as d3 from "d3";
import {useDataStore} from '@/stores/dataStore'
import {useDashboardStore} from "@/stores/dashboardStore";
import {useRegressionStore} from "@/stores/regressionStore";
import {useVisGeneratorStore} from "@/stores/visGeneratorStore";

export default {
    setup() {
        const dataStore = useDataStore()
        const dashboardStore = useDashboardStore()
        const regressionStore = useRegressionStore()
        const visGeneratorStore = useVisGeneratorStore()
        return {dataStore, dashboardStore, regressionStore, visGeneratorStore}
    },
    data() {
        return {
            files: null,
            starting_items: 1,
            name: null,
            page: 0,
            subset: false,
            row_number: 0,
        }
    },
    computed: {
        start() {
            return this.dataStore.start
        }
    },
    watch: {
        start() {
            this.files = null
            this.starting_items = 1
            this.name = null
        }
    },
    methods: {
        /**
         * gets called when a file is uploaded
         */
        uploaded() {
            this.dataStore.reset()
            const csvFile = this.files[0];
            this.name = csvFile.name.replace('.csv', '')
            const reader = new FileReader();
            reader.onload = (event) => {
                const data = d3.csvParse(event.target.result)
                this.dataStore.column_names = data.columns
                this.dataStore.csv = data
                this.dataStore.min_bin_size = Math.max(Math.floor(data.length / 20), 10) //at least 5% of people per bin
                this.row_number = data.length
            }
            reader.readAsText(csvFile)
            this.page++
        },
        /**
         * gets called when a target is selected
         */
        target_selected() {
            this.dataStore.target_all_options = [...new Set(this.dataStore.csv.map(d => d[this.dataStore.target_column]))]
            this.dataStore.target_all_options = this.dataStore.target_all_options.filter(d => !(d === null || d === ""))
            this.dataStore.target_option = null
            this.dataStore.target_operator = null
            this.dataStore.target_value = null
            if (this.dataStore.target_all_options.length <= 10) {
                this.dataStore.target_type= "categorical"
            } else {
                let options_num = this.dataStore.target_all_options.filter(d => !isNaN(d) && d !== "")
                if (options_num.length > 5) {
                    this.dataStore.target_type = "continuous"
                } else {
                    this.dataStore.target_type = "unknown"
                }
            }
        },
        /**
         * gets called when a target option is selected
         */
        target_option_selected() {
            if (this.dataStore.target_type === "categorical") {
                this.dataStore.target_label = this.dataStore.target_column + ":" + this.dataStore.target_option
            }
            if (this.dataStore.target_type === "continuous") {
                this.dataStore.target_label = this.dataStore.target_column + this.dataStore.target_operator + this.dataStore.target_value
            }
        },
        /**
         * start the calculation of the visualizations and closes the overlay
         */
        visualize() {
            this.dataStore.start = false
            if (this.subset) {
                this.subset_data()
            }
            this.dashboardStore.set_initial_default_settings(this.dataStore.csv.length, this.dataStore.target_column, this.dataStore.target_option)
            this.dataStore.calc_column_list()
            this.dashboardStore.add_dashboard_item(this.dataStore.column_list.find(d => d.name === useDataStore().target_column),
                [{type: 'impact', data_map: 'occurrence'}], false)
            let i = 0
            while (i < (this.starting_items - 1)) {
                let j = 0
                while (!this.dashboardStore.is_recommendation_column(this.dataStore.column_list[j])) {
                    j++
                }
                let best_column = this.dataStore.column_list[j]
                if (best_column.significance.score["regression"] >= 0.01) {
                    this.dashboardStore.add_dashboard_item(best_column, this.visGeneratorStore.generate_main_fact_visList(), true)
                    i++
                } else {
                    break
                }
            }

            this.files = null
        },

        /**
         * loads the diabetes example
         */
        async load_example() {
            const csvFile = "https://raw.githubusercontent.com/akleinau/raccoon/main/examples/diabetes_sample.csv";
            this.name = "diabetes example"
            const data = await d3.csv(csvFile, {crossOrigin: "anonymous"})
            this.dataStore.column_names = data.columns
            this.dataStore.csv = data
            this.dataStore.min_bin_size = Math.max(Math.floor(data.length / 20), 10) //at least 5% of people per bin

            this.dataStore.target_column = "Diabetes"
            this.target_selected()
            this.dataStore.target_option = "Yes"
            this.target_option_selected()
            this.dataStore.target_label = "diabetes"
            this.row_number = data.length

            this.page++
        },
        /**
         * only considers randomly selected subset of data
         */

        subset_data() {
            this.dataStore.csv = this.dataStore.csv.sort(() => Math.random() - Math.random()).slice(0, this.row_number)
            this.dataStore.min_bin_size = Math.max(Math.floor(this.dataStore.csv.length / 20), 10) //at least 5% of people per bin
        }
    }
}
</script>
