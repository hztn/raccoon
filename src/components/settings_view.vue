<template>
    <div :class="show_panels? 'w-100' : 'w-50'">
        <!-- Wording -->
        <v-expand-transition>
        <div class="d-flex w-100" v-if="dataStore.target !== undefined && dataStore.target !== null && !show_panels" transition="fade-transition">
            <v-text-field v-if="dataStore.target_type === 'categorical'"
                    :hint="dataStore.target.name + ':' + dataStore.target.options.find(d => d.name ===dataStore.target_option).label"
                    v-model="dataStore.target_label" variant="underlined" label="target label"
                    append-inner-icon="mdi-pencil" class="ml-3 mr-5 w-25"></v-text-field>
            <v-text-field v-if="dataStore.target_type === 'continuous'"
                    :hint="dataStore.target.name + dataStore.target_operator + dataStore.target_value"
                    v-model="dataStore.target_label" variant="underlined" label="target label"
                    append-inner-icon="mdi-pencil" class="ml-3 mr-5 w-25"></v-text-field>
            <v-text-field label="rows equal" v-model="dataStore.row_label" hint="eg people, participants, households"
                          append-inner-icon="mdi-pencil" class="w-25" variant="underlined"></v-text-field>
        </div>
        </v-expand-transition>

        <v-expansion-panels class="mx-3 mb-1 mt-1 w-100" v-model="show_panels">
            <!-- Design -->
            <v-expansion-panel value="design" v-if="!show_panels || show_panels.includes('design')">
                <v-expansion-panel-title>
                    <h4 class="mr-4">Design:</h4>

                    <div v-if="dashboardStore.default_colors[dashboardStore.intention].colors.type === 'scheme'">
                        <v-icon :style="'color:' + dashboardStore.default_colors[dashboardStore.intention].colors.color">mdi-auto-mode </v-icon>
                    </div>
                    <div v-else-if="dashboardStore.default_colors[dashboardStore.intention].colors.type === 'focus'">
                        <v-icon :style="'color:' + dashboardStore.default_colors[dashboardStore.intention].colors.color">mdi-circle </v-icon>
                    </div>
                    <div v-else>
                        <span v-for="(color,i) in dashboardStore.default_colors[dashboardStore.intention].colors.list" :key="i">
                            <v-icon :style="'color:' + color">mdi-circle</v-icon>
                        </span>
                    </div>

                </v-expansion-panel-title>
                <v-expansion-panel-text>
                    <div class="d-flex">
                        <!-- Color Scheme -->
                        <div>
                            <v-btn-toggle v-model="dashboardStore.default_colors[dashboardStore.intention].colors.type" label="Colors" class="mb-2" mandatory  >
                                <v-btn value="scheme" label="color based"> scheme </v-btn>
                                <v-btn value="focus" label="focus"> focus </v-btn>
                                <v-btn value="palette" label="scheme"> palette </v-btn>
                                <v-btn value="custom" label="custom"
                                         @click="custom_color_list=dashboardStore.default_colors[dashboardStore.intention].colors.list"> custom </v-btn>
                            </v-btn-toggle>

                            <div v-if="dashboardStore.default_colors[dashboardStore.intention].colors.type === 'scheme' || dashboardStore.default_colors[dashboardStore.intention].colors.type === 'focus'">
                                <div class="d-flex w-100 mb-2">
                                    Color based:
                                    <v-icon class="ml-2" :style="'color:' + dashboardStore.default_colors[dashboardStore.intention].colors.color">mdi-circle</v-icon>
                                    <v-icon class="ml-1">mdi-pencil</v-icon>
                                    <color-dialog :color="dashboardStore.default_colors[dashboardStore.intention].colors.color"
                                                  @update="neighborColor = $event; dashboardStore.default_colors[dashboardStore.intention].colors.color = neighborColor "></color-dialog>
                                </div>
                                <div class="d-flex w-100 mb-2" v-if="dashboardStore.default_colors[dashboardStore.intention].colors.type === 'focus'">
                                    Neutral Color:
                                    <v-icon class="ml-2" :style="'color:' + dashboardStore.default_colors[dashboardStore.intention].colors.neutralColor">mdi-circle</v-icon>
                                    <v-icon class="ml-1">mdi-pencil</v-icon>
                                    <color-dialog :color="dashboardStore.default_colors[dashboardStore.intention].colors.neutralColor"
                                                  @update="neutralColor = $event; dashboardStore.default_colors[dashboardStore.intention].colors.neutralColor = neutralColor "></color-dialog>
                                </div>
                                <div v-if="dashboardStore.default_colors[dashboardStore.intention].colors.type === 'scheme'">
                                  color variance between bins
                                  <v-slider v-model="dashboardStore.default_colors[dashboardStore.intention].colors.spread" min="0" max="200" step="5"
                                            style="max-width:200px"/>
                                </div>
                                color variance between factors
                                <v-slider v-model="dashboardStore.default_colors[dashboardStore.intention].colors.global_spread" min="0" max="500" step="5"
                                          style="max-width:200px"/>
                            </div>

                            <div v-if="dashboardStore.default_colors[dashboardStore.intention].colors.type === 'palette'" class="mr-5">
                                <div>Color scheme:</div>
                                <v-select v-model="scheme" :items="colors" dense variant="underlined">
                                    <template v-slot:selection="{item}">
                                        <v-icon class="mb-2" :style="'color:' + item.value">mdi-circle</v-icon>
                                    </template>
                                    <template v-slot:item="{item}">
                                        <div>
                                            <v-btn @click="scheme = item.value; dashboardStore.default_colors[dashboardStore.intention].colors.list=scheme"
                                                   variant="plain">
                                                <v-icon v-for="color in item.value" :key="color"
                                                        :style="'color:' + color">
                                                    mdi-circle
                                                </v-icon>
                                            </v-btn>
                                        </div>
                                    </template>
                                </v-select>
                            </div>

                            <div v-if="dashboardStore.default_colors[dashboardStore.intention].colors.type === 'custom'">
                                <div>Custom:</div>
                                <span v-for="(color,i) in custom_color_list" :key="i">
                                        <v-icon :style="'color:' + color">mdi-circle</v-icon>
                                        <v-icon class="mr-2">mdi-pencil</v-icon>
                                        <color-dialog :color="color"
                                                      @update="custom_color_list[i] = $event; dashboardStore.default_colors[dashboardStore.intention].colors.list=custom_color_list; color=$event"></color-dialog>
                                    </span>
                            </div>
                        </div>

                        <!-- Background -->
                        <v-radio-group v-model="dashboardStore.default_colors[dashboardStore.intention].background" label="Background"
                                       class="ml-5" hide-details>
                            <v-radio label="auto" :value="background_auto">
                                <template v-slot:label>
                                    Auto
                                </template>
                            </v-radio>
                            <v-radio v-for="item in this.background" :key="item" :value="item">
                                <template v-slot:label>
                                    <div class="mr-2"
                                         :style="'background:' + item.color + '; border: 1px solid ' + item.stroke + '; width: 100px; height: 30px'"/>
                                </template>
                            </v-radio>
                            <v-radio label="custom" :value="background_custom">
                                <template v-slot:label>
                                    <div class="mr-2"
                                         :style="'background:' + background_custom.color + '; border: 1px solid ' + background_custom.stroke + '; width: 100px; height: 30px'"/>
                                    <v-icon class="ml-2">mdi-pencil</v-icon>
                                </template>
                                <color-dialog :color="background_custom.color"
                                              @update="background_custom.color = $event; dashboardStore.default_colors[dashboardStore.intention].background.color = $event"></color-dialog>
                            </v-radio>

                        </v-radio-group>

                        <!-- Font Color -->
                        <v-radio-group v-model="dashboardStore.default_colors[dashboardStore.intention].text" label="Font Color" hide-details>
                            <v-radio v-for="color in this.fontColor" :key="color" :value="color">
                                <template v-slot:label>
                                    <v-icon class="mr-2" :style="'color:' + color">mdi-circle</v-icon>
                                </template>
                            </v-radio>
                            <v-radio label="custom" :value="fontColor_custom">
                                <template v-slot:label>
                                    <v-icon class="mr-2" :style="'color:' + fontColor_custom">mdi-circle</v-icon>
                                    <v-icon>mdi-pencil</v-icon>
                                </template>
                                <color-dialog :color="fontColor_custom"
                                              @update="fontColor_custom = $event; dashboardStore.default_colors[dashboardStore.intention].text = $event"></color-dialog>
                            </v-radio>
                        </v-radio-group>

                        <!-- Font Family -->
                        <v-radio-group v-model="dashboardStore.default_colors[dashboardStore.intention].font_family" label="Font Family"
                                       class="ml-5 mr-2" style="min-width:120px" hide-details>
                            <v-radio v-for="font in this.font_families" :key="font" :label="font" :value="font"
                                     :style="'font-family: ' + font"/>
                            <v-radio label="custom" :value="font_family_custom">
                                <template v-slot:label>
                                    <v-text-field v-model="font_family_custom" variant="underlined" density="compact"
                                                  style="min-width:100px" hide-details label="custom" class="mb-3"
                                                  @update:modelValue="dashboardStore.default_colors[dashboardStore.intention].font_family = font_family_custom"/>
                                    <v-icon>mdi-pencil</v-icon>
                                </template>
                            </v-radio>
                        </v-radio-group>

                    </div>
                </v-expansion-panel-text>
            </v-expansion-panel>

            <!-- Intention -->
            <v-expansion-panel value="intention" v-if="!show_panels || show_panels.includes('intention')">
                <v-expansion-panel-title><h4>Intention: {{ dashboardStore.intention.toUpperCase() }} </h4>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                    I want to...
                    <v-btn-toggle v-model="dashboardStore.intention" mandatory
                                  @update:modelValue="dashboardStore.update_settings_by_intention()"
                                  class="mb-1">
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

                    <div v-if="dashboardStore.intention === 'explore'">
                        Optimize visualizations for scientists to explore the data. Showing detailed information about the dataset.
                        <ul class="ml-5">
                            <li>Pictographs with percentages</li>
                            <li>Bar charts showing absolute numbers of participants</li>
                        </ul>
                    </div>
                    <div v-if="dashboardStore.intention === 'convince'">
                        Optimize visualizations to convince the public about a certain topic.
                        <ul class="ml-5">
                            <li>hiding context information increases perceived risk</li>
                            <li>Pictographs and bar charts as simple, easy to understand visualizations</li>
                        </ul>
                    </div>
                    <div v-if="dashboardStore.intention === 'educate'">
                        Optimize visualizations for scientists to educate the public about their findings. Showing only the most important
                        information about the dataset.
                        <ul class="ml-5">
                            <li>Pictographs showing natural frequencies (eg 22/100) best for understanding risks</li>
                            <li>Pie Charts for best overview over a distribution (on cost of accuracy)</li>
                        </ul>
                    </div>

                </v-expansion-panel-text>
            </v-expansion-panel>

            <!-- Calculation -->
            <v-expansion-panel value="calculation" v-if="!show_panels || show_panels.includes('calculation')">
                <v-expansion-panel-title><h4>Calculation </h4></v-expansion-panel-title>
                <v-expansion-panel-text>
                    <div class="d-flex">
                        <div>
                            <v-checkbox label="exclude missing values" v-model="dataStore.exclude_missing"></v-checkbox>


                        </div>
                        <div style="width:200px" class="ml-2">
                            <v-text-field type="number" label="minimal bin size" class="align-self-stretch"
                                          v-model="dataStore.min_bin_size"/>
                        </div>
                        <div class="flex-grow-1 ml-5">
                            <v-expansion-panels>
                                <v-expansion-panel>
                                    <v-expansion-panel-title>Regression</v-expansion-panel-title>
                                    <v-expansion-panel-text>
                                        <v-text-field type="number" class="mx-5" label="min correlation with target"
                                                      v-model="regressionStore.correlation_boundary"/>
                                        <v-text-field type="number" class="mx-5" label="epochs"
                                                      v-model="regressionStore.epochs"/>
                                        <v-text-field type="number" class="mx-5" label="test ratio"
                                                      v-model="regressionStore.test_ratio"/>
                                        <v-text-field type="number" class="mx-5" label="batch size"
                                                      v-model="regressionStore.batch_size"/>
                                        <v-text-field type="number" class="mx-5" label="learning rate"
                                                      v-model="regressionStore.learning_rate"/>
                                        <v-btn variant="outlined" @click="regressionStore.compute_score()">Recalculate
                                        </v-btn>
                                    </v-expansion-panel-text>
                                </v-expansion-panel>
                            </v-expansion-panels>
                        </div>
                        <div class="ml-5">
                            <v-btn variant="outlined" @click="dataStore.calc_column_list()">Recalculate</v-btn>
                        </div>

                    </div>
                </v-expansion-panel-text>
            </v-expansion-panel>
        </v-expansion-panels>
    </div>
</template>

<script>
import {useDashboardStore} from "@/stores/dashboardStore";
import {useDataStore} from "@/stores/dataStore";
import {useScoreStore} from "@/stores/scoreStore";
import {useRegressionStore} from "@/stores/regressionStore";
import * as d3 from "d3";
import ColorDialog from "@/components/helpers/color-dialog.vue";

export default {
    name: "settings_view",
    components: {ColorDialog},
    setup() {
        const dataStore = useDataStore()
        const dashboardStore = useDashboardStore()
        const scoreStore = useScoreStore()
        const regressionStore = useRegressionStore()
        return {dataStore, dashboardStore, scoreStore, regressionStore}
    },
    data() {
        return {
            show: false,
            color_mode: "oneColor",
            color_num: 5,
            neighborColor: "#1302B5",
            neutralColor: "grey",
            scheme: d3.quantize(d3.interpolateCool, 5).map(d => d3.color(d).hex()),
            colors: [
                d3.quantize(d3.interpolateCool, 5).map(d => d3.color(d).hex()),
                d3.quantize(d3.interpolatePlasma, 5).map(d => d3.color(d).hex()),
                d3.quantize(d3.interpolateViridis, 5).map(d => d3.color(d).hex()),
                d3.quantize(d3.interpolateSpectral, 5).map(d => d3.color(d).hex()),
                d3.quantize(d3.interpolateRainbow, 5).map(d => d3.color(d).hex()),
                d3.quantize(d3.interpolateSinebow, 5).map(d => d3.color(d).hex()),
            ],
            custom_color_list: d3.quantize(d3.interpolateCool, 5).map(d => d3.color(d).hex()),
            background: [{color: "Gainsboro", stroke: "None"}, {color: "#D3D9E6", stroke: "None"}, {
                color: "white", stroke: "darkgray"
            }],
            background_custom: {color: "#efe7de", stroke: "None"},
            background_auto: {color: "auto", stroke: "None"},
            fontColor: ["black", "midnightBlue", "#181818"],
            fontColor_custom: "#000000",
            font_families: ["Verdana", "Arial", "monospace", "Times New Roman"],
            font_family_custom: "",
            show_panels: null
        }
    },
    methods: {
        close() {
            this.show = false
        }
    },
    watch: {
        current_fact_group() {
            this.show_panels = null
        }
    },
    computed: {
      current_fact_group() {
            return this.dashboardStore.current_fact_group
        }
    }
}
</script>

<style scoped>

</style>