<template>
    <v-dialog v-model="dialog" width="auto" activator="parent" :scrim="false">
        <v-card>
            <v-color-picker v-model="new_color"
                            @update:modelValue="this.$emit('update', new_color)"></v-color-picker>
            <v-card-actions>
                <v-btn @click="dialog = false"> Save</v-btn>
                <v-btn @click="cancel">Cancel</v-btn>
            </v-card-actions>

        </v-card>
    </v-dialog>
</template>

<script>
export default {
    name: "color-dialog",
    props: ['color'],
    emits: ['update'],
    data() {
        return {
            new_color: "#1976d2",
            old_color: "#1976d2",
            dialog: false,
        }
    },
    watch: {
        dialog() {
            this.new_color = this.color
            this.old_color = this.color
        }
    },
    methods: {
        cancel() {
            this.$emit('update', this.old_color)
            this.dialog = false
        }
    }
}
</script>

<style scoped>

</style>