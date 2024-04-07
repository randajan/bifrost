# @randajan/bifrost

[![NPM](https://img.shields.io/npm/v/@randajan/bifrost.svg)](https://www.npmjs.com/package/@randajan/bifrost) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)



## Install

```bash
npm install @randajan/bifrost
```

or

```bash
yarn add @randajan/bifrost
```


## Main methods

### Client Bifrost Router

| Function | Description | Parameters | Return Value |
|-|-|-|-|
| `txLock` | Locks the transmission on the outbound channel (tx) for data transfer for the duration of the transaction execution. | `channel` - Name of the channel to perform the transaction on.<br>`execute` - Function to execute the transaction.<br>`args` - Optional arguments for the `execute` function. | `Promise` - Asynchronous operation that resolves with the result of the transaction. |
| `rxLock` | Locks the reception on the inbound channel (rx) for data transfer for the duration of the transaction execution. | `channel` - Name of the channel to perform the transaction on.<br>`execute` - Function to execute the transaction.<br>`args` - Optional arguments for the `execute` function. | `Promise` - Asynchronous operation that resolves with the result of the transaction. |
| `tx` | Sends data on the outbound channel (tx) and processes responses using the provided function. | `channel` - Name of the channel to send data on.<br>`transceiver` - data or Function for sending data on the channel.<br>*Note:* If `transceiver` is a function, it accepts a async callback parameter for sending data on the channel. | `Promise` - Asynchronous operation that resolves with the result of the data transfer. |
| `rx` | Receives data on the inbound channel (rx) and processes it using the provided function. | `channel` - Name of the channel to receive data on.<br>`receiver` - Function for processing received data.<br>*Note:* If `receiver` is a function, it accepts the received data as a parameter. | `Function` - Function for unsubscribing from the inbound channel. |


## License

MIT © [randajan](https://github.com/randajan)
