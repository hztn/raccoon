<template>
    <v-dialog v-model="show" style="width:95%">
        <template v-slot:activator="{ props }">

            <v-btn v-bind="props" class="h-auto px-4 mx-2" :variant="textButton? 'plain' : 'elevated'" prepend-icon="mdi-export-variant">
                Export
            </v-btn>

        </template>
        <v-card>
            <v-card-title>Export</v-card-title>

            <v-card-text style="height:800px" class="overflow-auto">

                <div v-for="item in items" v-bind:key="item" >
                    <v-divider></v-divider>
                    <h2 class="ma-3 d-flex justify-center w-100">{{ item.column.label }} </h2>
                    <div v-for="(vis,i) in item.visList" v-bind:key="vis" class="d-flex w-100 justify-center">
                        <vis_parser :vis="vis" :column="item.column"
                                    :width="450" :index="item.start_index + i"/>
                    </div>

                </div>

            </v-card-text>

            <v-card-actions class="w-100 bg-grey-lighten-2 pa-5">
                <div class="d-flex w-100">
                    <v-btn @click="show = false" class="px-9" variant="elevated">Close</v-btn>
                    <v-btn @click="pdfExport" variant="elevated" prepend-icon="mdi-file-pdf-box">pdf Export</v-btn>
                    <v-btn @click="pngExport" variant="elevated" prepend-icon="mdi-file-image">png Export</v-btn>
                </div>
            </v-card-actions>

        </v-card>
    </v-dialog>
</template>

<script>
import {useDashboardStore} from "@/stores/dashboardStore";
import {useHelperStore} from "@/stores/helperStore";
import {useDataStore} from "@/stores/dataStore";
import vis_parser from "@/components/visualization/vis_parser.vue";

import * as svg2png from "save-svg-as-png/lib/saveSvgAsPng.js";
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import pdfMake from "pdfmake/build/pdfmake";

pdfMake.vfs = pdfFonts && pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : globalThis.pdfMake.vfs;

export default {
    name: "export_overlay",
    components: {vis_parser},
    props: [
        "textButton"
    ],
    setup() {
        const dashboardStore = useDashboardStore()
        const helperStore = useHelperStore()
        const dataStore = useDataStore()
        return {dashboardStore, helperStore, dataStore}
    },
    data() {
        return {
            show: false,
            exportOptions: {
                backgroundColor: "white",
                encoderOptions: 1,
                scale: 2,
            }
        }
    },
    methods: {
        /**
         * exports all current dashboard visualizations as pdf
         * @returns {Promise<void>}
         */
        async pdfExport() {
            let data = {
                content: [
                    {
                        text: "Risk Factors for " + this.dataStore.target_label,
                        style: 'header',
                        margin: [0, 140, 0, 0]
                    },
                    {
                        text: "provided by RACCOON - Risk Factor Communication",
                        style: 'textCentered',
                        margin: [0, 20, 0, 0]
                    }
                ],
                styles: {
                    header: {
                        fontSize: 20,
                        bold: true,
                        margin: [0, 0, 0, 10],
                        alignment: 'center'
                    },
                    text: {
                        fontSize: 14,
                        margin: [0, 0, 0, 10],
                        alignment: 'center'
                    },
                    textCentered: {
                        fontSize: 14,
                        margin: [0, 0, 0, 10],
                        alignment: 'center'
                    }
                },
                pageSize: 'A4',
                pageOrientation: 'portrait',
            }

            for (let i = 0; i < this.items.length; i++) {
                let item = this.items[i]
                data.content.push({
                    text: item.column.label,
                    style: 'header',
                    pageBreak: 'before'
                })
                for (let j = 0; j < item.visList.length; j++) {
                    let exp = this.dashboardStore.current_fact_group_exports[item.start_index + j]
                    if (exp.type === "svg") {
                        await svg2png.svgAsPngUri(exp.item, this.exportOptions).then(uri => {
                            data.content.push({
                                image: uri, width: exp.width, margin: [0, 15, 0, 15]
                            })
                        })
                    } else if (exp.type === "text") {
                        data.content.push({
                            text: this.helperStore.parse_text(exp.item, item.column).map(d => d.text).join(''),
                            style: 'text',
                            margin: [0, 15, 0, 15]
                        })
                    }
                }
            }

            pdfMake.createPdf(data).open()
        },
        /**
         * exports all current dashboard visualizations as png
         */
        pngExport() {
            for (let i = 0; i < this.items.length; i++) {
                let item = this.items[i]
                for (let j = 0; j < item.visList.length; j++) {
                    let exp = this.dashboardStore.current_fact_group_exports[item.start_index + j]
                    if (exp.type === "svg") {
                        svg2png.saveSvgAsPng(exp.item, "raccoon_" + item.column.label.replace(" ", "_") + j + ".png", this.exportOptions)
                    } else if (exp.type === "text") {
                        let blob = new Blob([this.helperStore.parse_text(exp.item, item.column).map(d => d.text).join(' ')], {type: "text/plain;charset=utf-8"});
                        saveAs(blob, "raccoon" + item.column.label.replace(" ", "_") + j + ".txt");
                    }
                }
            }

        }
    },
    computed: {
        /**
         * returns a list of all dashboard items with the start index for right svg export saving
         *
         * @returns {*[]}
         */
        items() {
            let visCounter = 0
            let items = []
            for (let i = 0; i < this.dashboardStore.dashboard_items.length; i++) {
                items.push({
                    column: this.dashboardStore.dashboard_items[i].column,
                    visList: this.dashboardStore.dashboard_items[i].visList,
                    start_index: visCounter
                })
                visCounter += this.dashboardStore.dashboard_items[i].visList.length
            }
            return items
        }
    }
}
</script>

<style scoped>

</style>