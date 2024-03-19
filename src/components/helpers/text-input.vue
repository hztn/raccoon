<template>
  <!-- help -->
    <div>
        <v-dialog activator="parent" style="width: 700px">
            <template v-slot:activator="{ props }">
                <v-btn v-bind="props" prepend-icon="mdi-help-circle-outline" variant="plain"> help
                </v-btn>
            </template>
            <v-card title="Help">
                <v-card-text>
                    <div class="mb-2">
                        Modify text. Use the menu over a text element to change the color, delete the element or add
                        another
                        element for differently colored text.
                    </div>
                    <div class="mb-2">
                        You can use the following variables to make sure that your visualizations are consistent:
                    </div>
                    <table>
                        <tr>
                            <td>
                                <v-chip>$rows</v-chip>
                            </td>
                            <td>rows equal ...</td>
                            <td>Here: <b>{{ dataStore.row_label }} </b></td>
                        </tr>
                        <tr>
                            <td>
                                <v-chip>$columns</v-chip>
                            </td>
                            <td>label of the current column</td>
                            <td>Here: <b>{{ dashboardStore.current_fact_group.column.label }} </b></td>
                        </tr>
                        <tr>
                            <td>
                                <v-chip>$outcome</v-chip>
                            </td>
                            <td>label of the target</td>
                            <td>Here: <b>{{ dataStore.target_label }} </b></td>
                        </tr>
                        <tr>
                            <td>
                                <v-chip>$outcome_column</v-chip>
                            </td>
                            <td>label of the target column</td>
                            <td>Here: <b>{{ dataStore.target_column }} </b></td>
                        </tr>
                    </table>
                </v-card-text>

            </v-card>
        </v-dialog>
    </div>
    <div class="d-flex flex-wrap">
        <div v-for="(el,i) in new_text" v-bind:key="el">
            <!-- menu buttons -->
            <div class="d-flex justify-center align-center">

                <!-- color selection -->
                <div>
                    <v-select class="mx-2" variant="underlined" :items="['black', '$color', custom_colors[i]]"
                              v-model="el.color" style="width:50px" :disabled="disabled">
                        <template v-slot:selection="{ item }">
                            <v-icon :style="'color:' + get_color(item.value)">mdi-circle</v-icon>
                        </template>
                        <template v-slot:item="{ item }">
                            <div>
                                <v-btn @click="el.color=item.value" class="w-100" variant="text">
                                    <v-icon v-if="item.value !== 'black' && item.value !== '$color'">mdi mdi-pencil
                                    </v-icon>
                                    <v-icon v-else :style="'color:' + get_color(item.value)">mdi-circle</v-icon>
                                    <color-dialog v-if="item.value !== 'black' && item.value !== '$color'"
                                                  :color="get_color(custom_colors[i])"
                                                  @update="custom_colors[i] = $event; el.color = $event;"></color-dialog>
                                </v-btn>
                            </div>
                        </template>
                    </v-select>
                </div>

                <v-divider vertical class="mt-5 mb-5"></v-divider>

                <v-btn density="compact" icon variant="text" v-if="!el.italic" @click="el.italic = true"><i>I</i></v-btn>
                <v-btn density="compact" icon variant="tonal" v-else @click="el.italic = false"><i>I</i></v-btn>

                <v-btn density="compact" icon variant="text" v-if="!el.weight" @click="el.weight = true"><b>B</b></v-btn>
                <v-btn density="compact" icon variant="tonal" v-else @click="el.weight = false"><b>B</b></v-btn>

                <v-divider vertical class="mt-5 mb-5"></v-divider>

                <!-- add, delete buttons -->
                <v-btn icon="mdi-delete" variant="plain" density="compact" :disabled="disabled"
                       @click="delete_text_el(i)"></v-btn>
                <v-btn icon="mdi-plus" variant="plain" density="compact" :disabled="disabled"
                       @click="add_text_el(i)"></v-btn>
            </div>

            <!-- text area -->
            <v-textarea class="mx-1 text-no-wrap" v-model="el.text" :rows="1" auto-grow
                        :disabled="disabled"
                        :style="'width:' + +(el.text.length*9 + 30) + 'px; min-width:130px; max-width:700px'"/>
        </div>
    </div>
</template>

<script>
import ColorDialog from "@/components/helpers/color-dialog.vue";
import {useDataStore} from "@/stores/dataStore";
import {useDashboardStore} from "@/stores/dashboardStore";

export default {
    name: "text-input",
    components: {ColorDialog},
    props: ['text', 'default', 'color', 'disabled'],
    emits: ['change'],
    data() {
        return {
            old_text: "",
            new_text: "",
            custom_colors: []
        }
    },
    setup() {
        const dataStore = useDataStore()
        const dashboardStore = useDashboardStore()
        return {dataStore, dashboardStore}
    },
    watch: {
        text: {
            handler: function () {
                this.update_texts()
            },
            deep: true

        },
        new_text: {
            handler: function () {
                if (this.text !== undefined) {
                    this.$emit("change", this.new_text)
                }
            },
            deep: true
        }
    },
    created() {
        this.update_texts()
    },
    methods: {
        /**
         * fills in the visualizations color if it is $color
         *
         * @param color
         * @returns {*}
         */
        get_color(color) {
            if (color === "$color") {
                return this.color
            } else {
                return color
            }
        },
        /**
         * updates the text after changes
         */
        update_texts() {
            if (this.text && this.text !== "") {
                this.new_text = this.text
                if (this.new_text.italic === undefined) {
                    this.new_text.italic = false
                }
                if (this.new_text.weight === undefined) {
                    this.new_text.weight = false
                }
            } else {
                this.new_text = JSON.parse(JSON.stringify(this.default))
            }
            this.custom_colors = this.new_text.map(_ => "ffeef0")
        },
        /**
         * adds a new text element
         * @param i
         */
        add_text_el(i) {
            this.new_text.splice(i + 1, 0, {text: "", color: "black", italic: false, weight: false})
            this.custom_colors.splice(i + 1, 0, "ffeef0")
        },
        /**
         * deletes a text element
         * @param i
         */
        delete_text_el(i) {
            this.new_text.splice(i, 1)
            this.custom_colors.splice(i, 1)
        }
    }
}
</script>

<style scoped>
th, td {
    padding-right: 10px;
    padding-bottom: 5px;
}
</style>