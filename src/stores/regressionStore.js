import {defineStore} from 'pinia'
import {useDataStore} from "@/stores/dataStore";
import * as d3 from "d3";
import {useScoreStore} from "@/stores/scoreStore";
import {useDashboardStore} from "@/stores/dashboardStore";

export const useRegressionStore = defineStore('regressionStore', {
    state: () => ({
        performance_diff: 0,
        dashboard_performance: 0,
        test_ratio: 0.1,
        batch_size: 10,
        learning_rate: 0.01,
        epochs: 5,
        correlation_boundary: 0.1,
        prepared_data: {}
    }),
    actions: {
        /**
         * calculates sigmoid function
         */
        sigmoid(x) {
            return 1 / (1 + Math.exp(-x))
        },
        /**
         * calculates the dot product
         *
         * @param a
         * @param b
         * @returns {function(*, *): *}
         */
        dot_product(a, b) {
            return a.map((x, i) => a[i] * b[i]).reduce((m, n) => m + n)
        },
        /**
         * calculate loss
         */
        loss(pred, actual) {
            return -(actual * Math.log(pred) + (1 - actual) * Math.log(1 - pred))
        },
        /**
         * calculate accuracy
         *
         * @param TEST_SET_I
         * @param Data
         * @param weights
         * @param b
         * @param y_pred
         * @param y_actual
         */
        accuracy(TEST_SET_I, Data, weights, b, y_pred, y_actual) {
            //check accuracy
            let correct = 0
            for (let i = TEST_SET_I; i < y_actual.length; i++) {
                let row = Data[i]
                let curr_pred = weights ? this.sigmoid(this.dot_product(weights, row) + b + y_pred[i]) : this.sigmoid(b + y_pred[i])
                let curr_actual = y_actual[i]
                if (curr_pred > 0.5 && curr_actual === 1) {
                    correct++
                } else if (curr_pred < 0.5 && curr_actual === 0) {
                    correct++
                }
            }
            return (correct / (y_actual.length - TEST_SET_I))
        },
        /**
         * calculates mean error, adjusting for the number of positive and negative examples. Multiplied by 100 to get
         * better readable numbers
         *
         * @param TEST_SET_I
         * @param Data
         * @param weights
         * @param b
         * @param y_pred
         * @param y_actual
         * @returns {number}
         * @constructor
         */
        ME(TEST_SET_I, Data, weights, b, y_pred, y_actual) {
            let error_pos = 0
            let count_pos = 0
            let error_neg = 0
            let count_neg = 0
            for (let i = TEST_SET_I; i < y_actual.length; i++) {
                let row = Data[i]
                let curr_pred = weights ? this.sigmoid(this.dot_product(weights, row) + b + y_pred[i]) : this.sigmoid(b + y_pred[i])
                let curr_actual = y_actual[i]
                let error = Math.abs(curr_pred - curr_actual)
                if (curr_actual === 1) {
                    error_pos += error
                    count_pos++
                }
                if (curr_actual === 0) {
                    error_neg += error
                    count_neg++
                }
            }
            return 0.5*((error_pos / count_pos) + (error_neg / count_neg)) * 100
        },
        /**
         * calculate f-score
         *
         * @param TEST_SET_I
         * @param Data
         * @param weights
         * @param b
         * @param y_pred
         * @param y_actual
         */
       f_score(TEST_SET_I, Data, weights, b, y_pred, y_actual) {
            //check accuracy
            let FP = 0
            let TP = 0
            let FN = 0
            for (let i = TEST_SET_I; i < y_actual.length; i++) {
                let row = Data[i]
                let curr_pred = weights ? this.sigmoid(this.dot_product(weights, row) + b + y_pred[i]) : this.sigmoid(b + y_pred[i])
                let curr_actual = y_actual[i]
                if (curr_pred > 0.5 && curr_actual === 1) {
                    TP++
                }
                if (curr_pred > 0.5 && curr_actual === 0) {
                    FP++
                }
                if (curr_pred < 0.5 && curr_actual === 1) {
                    FN++
                }
            }

            let precision = (TP+FN) > 0 ? TP/(TP+FN) : 1
            let recall = (TP+FP) > 0 ? TP/(TP+FP) : 1

            return (precision+recall) > 0 ? (2*precision*recall)/(precision+recall) : 0
        },
        /**
         * compute predictions without sigma
         *
         * @param weights
         * @param b
         * @param data
         * @param y_pred
         * @returns {*[]}
         */
        compute_new_prediction(weights, b, data, y_pred) {
            let y_new_pred = []
            for (let i = 0; i < y_pred.length; i++) {
                let row = weights ? data[i] : null
                let curr_pred = weights ? this.dot_product(weights, row) + b + y_pred[i] : b + y_pred[i]
                y_new_pred.push(curr_pred)
            }
            return y_new_pred
        },
        /**
         * calculate pearson coefficient of normalized data
         */
        pearson_of_normalized(x, y) {
            return x.reduce((a, b, i) => a + b * y[i], 0) / x.length
        },
        /**
         * train
         */
        train(columns, map, Data, y_pred, y_actual, column_place) {

            const onlyBias = Data.length === 0

            //create weight matrix with one weight per feature plus bias
            let weights = onlyBias ? null : Array(Data[0].length).fill(0)
            let b = 0

            const TEST_SET_I = y_actual.length - Math.floor(y_actual.length / (100 * this.test_ratio))

            //optimize weights using gradient descent
            //for each epoch
            for (let epoch = 0; epoch < this.epochs; epoch++) {
                //let accuracy = this.accuracy(TEST_SET_I, Data, weights, b, y_pred, y_actual);

                //for each batch of rows in data
                for (let i = 0; i < TEST_SET_I; i += this.batch_size) {
                    let loss = []
                    let dW = []
                    let db = []
                    for (let j = 0; j < this.batch_size; j++) {
                        //multiplicate weights with data
                        let row = Data[j + i]
                        let curr_pred = onlyBias ? this.sigmoid(b + y_pred[j + i]) : this.sigmoid(this.dot_product(weights, row) + b + y_pred[j + i])
                        let curr_actual = y_actual[j + i]

                        loss.push(this.loss(curr_pred, curr_actual))
                        if (!onlyBias) dW.push(row.map((d) => (curr_pred - curr_actual) * d))
                        db.push(curr_pred - curr_actual)
                    }

                    //compute derivates
                    if (!onlyBias) dW = dW[0].map((_, i) => d3.mean(dW.map(d => d[i])))
                    db = d3.mean(db)


                    //update weights
                    if (!onlyBias) weights = weights.map((d, i) => d - this.learning_rate * dW[i])
                    b = b - this.learning_rate * db

                    //  if (i % (Math.floor(Data[0].length / (this.batch_size)) * 20) === 0) {
                    //       console.log("Loss: " + d3.mean(loss) + " Accuracy: " + accuracy)
                    //   }

                }
            }

            let accuracy = this.accuracy(TEST_SET_I, Data, weights, b, y_pred, y_actual);
            let f_score = this.f_score(TEST_SET_I, Data, weights, b, y_pred, y_actual);
            let ME = this.ME(TEST_SET_I, Data, weights, b, y_pred, y_actual);

            //combine map with weights and then sort
            let weights_map = map.map((d, i) =>
                ({
                    "type": d.type,
                    "name": d.name,
                    "option": d.option,
                    "weight": weights[i],
                })
            ) //.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))

            const dataStore = useDataStore()
            const dashboardStore = useDashboardStore()

            if (column_place === "column_list") {
                columns.forEach(name => {
                    //let influence = d3.max(weights_map.filter(d => d.name === column).map(d => Math.abs(d.weight)))
                    let column = dataStore.column_list.find(d => d.name === name)
                    if (column) {
                        column.significance.score["regression"] = this.dashboard_performance - ME
                        //console.log(name + ": " + (this.dashboard_performance - ME))
                        if (this.dashboard_performance - ME > this.performance_diff) this.performance_diff = this.dashboard_performance - ME
                    }
                })
            }

            if (column_place === "dashboard") {
                dashboardStore.dashboard_items.forEach(item => {
                    if (item.column.significance) {
                        let influence = d3.max(weights_map.filter(d => d.name === item.name).map(d => Math.abs(d.weight)))
                        if (!influence) influence = 0
                        item.column.significance.score["regression"] = influence
                    }
                })
            }

            return [this.compute_new_prediction(weights, b, Data, y_pred), accuracy, f_score, ME]

        },
        /**
         * prepare target for regression
         *
         * @returns {*[]}
         */
        prepare_target() {
            let dataStore = useDataStore()
            let y = []
            dataStore.csv.forEach(d => {
                if (dataStore.target_type === "categorical") {
                    if (d[dataStore.target_column] === dataStore.target_option) {
                        y.push(1)
                    } else {
                        y.push(0)
                    }
                }
                if (dataStore.target_type === "continuous") {
                    if (dataStore.target_operator === "=") {
                        y.push(d[dataStore.target_column] === dataStore.target_value ? 1 : 0)
                    }
                    if (dataStore.target_operator === ">") {
                        y.push(d[dataStore.target_column] > dataStore.target_value ? 1 : 0)
                    }
                    if (dataStore.target_operator === "<") {
                        y.push(d[dataStore.target_column] < dataStore.target_value ? 1 : 0)
                    }
                }
            })
            if (y.length === 0) console.log("Error, target neither categorical nor continuous")
            return y
        },
        /**
         * prepare parameters for regression
         */
        prepare_parameters() {
            const dataset_length = useDataStore().csv.length

            //learning rate decreasing with length
            this.learning_rate = Math.max(0.001, Math.min(0.1, 1 / Math.sqrt(dataset_length))).toFixed(3)

            //epochs decreasing with length
            this.epochs = Math.max(1, Math.min(50, Math.floor(10000/ dataset_length )))

            //adjust correlation boundary to current dataset
            let dataStore = useDataStore()

            const column_count = dataStore.column_list.length
            const cutoff_index = Math.min(20, column_count-1)

            const cutoff_correlation = dataStore.column_list
                .map(column => Math.abs(column.correlation_with_target))
                .sort((a, b) => b - a)[cutoff_index]

            this.correlation_boundary = Math.max(0.05, Math.min(0.9, cutoff_correlation)).toFixed(2)

            console.log("dataset_size: " + dataset_length + " learning_rate: " + this.learning_rate + " epochs: " + this.epochs, "correlation_boundary: " + this.correlation_boundary)
        },
        /**
         * create prepared data based on variable summaries
         */
        prepare_data() {
            this.prepare_parameters()

            let dataStore = useDataStore()

            //gets csv data - categorical, numerical, ordinal data, and target
            dataStore.column_list.forEach(column => {

                if (column && Math.abs(column.correlation_with_target) >= this.correlation_boundary) {

                    let data_items = []
                    let map_items = []
                    if (column.type === "categorical") {
                        // convert categorical data to one hot encoding
                        column.options.forEach(option => {
                            data_items.push(column.data.map(d => d === option.name ? 1 : 0))
                            map_items.push({
                                "type": "categorical",
                                "name": column.name,
                                "option": option.name
                            })
                        })

                    } else if (column.type === "continuous") {
                        //normalize continuous data
                        let mean = d3.mean(column.data)
                        let stddev = d3.deviation(column.data)
                        data_items.push(column.data.map(d => isNaN(d) || d === "" ? 0 : (d - mean) / stddev))
                        map_items.push({
                            "type": "continuous",
                            "name": column.name,
                        })
                    }


                    if (data_items.length > 0) {
                        this.prepared_data[column.name] = [data_items, map_items]
                    }
                }


            })


        },
        /**
         * subset prepared data based on columns
         *
         * @param columns
         * @returns {*[][]}
         */
        get_prepared_data_subset(columns) {
            let map = [] //create feature matrix and map to trace back each feature to its original column/ option
            let Data = []

            columns.forEach(column => {
                let prep = this.prepared_data[column]
                if (prep) {
                    Data.push(...prep[0])
                    map.push(...prep[1])
                }
            })

            //transpose data for faster calculations later
            if (Data.length > 0) {
                Data = Data[0].map((_, i) => Data.map(row => row[i]))
            }

            return [map, Data]
        },

        /**
         * score computation
         */
        compute_score() {
            this.performance_diff = 0
            let dashboardStore = useDashboardStore()
            let dataStore = useDataStore()
            let y = this.prepare_target()
            let dashboard_columns = dashboardStore.dashboard_items
                .filter(d => dashboardStore.is_confounding_factor(d.column))
                .map(d => d.name)
            let [dashboard_map, dashboard_data] = this.get_prepared_data_subset(dashboard_columns)
            console.log("training on dashboard:")
            let [y_pred, accuracy, f_score, ME] = this.train(dashboard_columns, dashboard_map, dashboard_data, Array(y.length).fill(0), y, "dashboard")
            this.dashboard_performance = ME
            console.log("dashboard accuracy: " + accuracy + " f_score: " + f_score + " ME: " + ME)
            console.log("training on remaining data:")
            useDataStore().column_names.forEach(name => {
                if (!useDashboardStore().dashboard_items.map(d => d.name).includes(name) &&
                    name !== useDataStore().target_column) {
                    if (!dashboardStore.excluded_columns.includes(name)) {
                        let [map, Data] = this.get_prepared_data_subset([name])
                        if (Data.length > 0) this.train([name], map, Data, y_pred, y, "column_list")
                        else {
                            let column = dataStore.column_list.find(d => d.name === name)
                            if (column) {
                                column.significance.score["regression"] = 0
                            }
                        }
                    } else {
                        let column = dataStore.column_list.find(d => d.name === name)
                        if (column) {
                            column.significance.score["regression"] = 0
                        }
                    }
                }
            })
            console.log("performance diff: " + this.performance_diff.toFixed(3))
            let scoreStore = useScoreStore()
            scoreStore.score = "regression"
            scoreStore.sort_summaries()
        },
        /**
         * reset
         */
        reset() {
            this.performance_diff= 0
            this.dashboard_performance= 0
            this.test_ratio= 0.1
            this.batch_size= 10
            this.learning_rate= 0.01
            this.epochs = 5
            this.correlation_boundary = 0.1
            this.prepared_data = {}
        }
    }
})