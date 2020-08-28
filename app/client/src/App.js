import React, { Component } from "react";
import FundraiserFactoryContract from "./contracts/FundraiserFactory.json";
import getWeb3 from "./getWeb3";

import "./App.css";

class App extends Component {
  state = { storageValue: 0, web3: null, accounts: null, contract: null, loading:false };

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = FundraiserFactoryContract.networks[networkId];
      const instance = new web3.eth.Contract(
        FundraiserFactoryContract.abi,
        deployedNetwork && deployedNetwork.address,
      );

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ web3, accounts, contract: instance });
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

  handleClick = async () => {
    //const { web3 } = this.state;

    // Check if MetaMask is installed
    if (!window.ethereum) {
      window.alert('Please install MetaMask first.');
      return;
    }

    /* if (!web3) {
      try {
        // Request account access if needed
        //await window.ethereum.enable();

        // We don't know window.web3 version, so we use our own instance of Web3
        // with the injected provider given by MetaMask
        web3 = new Web3(window.ethereum);
        this.setState({ web3: web3 })
      } catch (error) {
        window.alert('You need to allow MetaMask.');
        return;
      }
    } */

    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const account = accounts[0];
    if (!account) {
      window.alert('Please activate MetaMask first.');
      return;
    }

    const publicAddress = account.toLowerCase();
    this.setState({ loading: true })

    // Look if user with current publicAddress is already present on backend
    fetch(
      `http://localhost:8088/users?publicAddress=${publicAddress}`
    )
      .then((response) => response.json())
      // If yes, retrieve it. If no, create it.
      .then((users) =>{
        //users.length ? users[0] : this.handleSignup(publicAddress)
        return users;
      })
      // Popup MetaMask confirmation modal to sign message
      .then(this.handleSignMessage)
      // Send signature to backend on the /auth route
      .then(this.handleAuthenticate)
      // Pass accessToken back to parent component (to save it in localStorage)
      .then((res)=>{
        console.log('logged in', res)
        this.setState({ loading: false})
      })
      .catch((err) => {
        window.alert(err);
        this.setState({ loading: false})
      });
  };

  handleSignMessage = async ({
    publicAddress,
    nonce,
  }) => {
    const { web3 } = this.state;
    try {
      const signature = await web3.eth.personal.sign(
        `I am signing my one-time nonce: ${nonce}`,
        publicAddress,
        '' // MetaMask will ignore the password argument here
      );

      return { publicAddress, signature };
    } catch (err) {
      throw new Error('You need to sign the message to be able to log in.' + err);
    }
  };

 handleAuthenticate = ({
      publicAddress,
      signature,
    }) =>
      fetch(`http://localhost:8088/auth`, {
        body: JSON.stringify({ publicAddress, signature }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      }).then((response) => response.json());

  render() {
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    return (
      <div className="App">
        <h1>Good to Go!</h1>
        <p>Your Truffle Box is installed and ready.</p>
        <h2>Login Example</h2>
        <button className="Login-button Login-mm" onClick={this.handleClick}>
          {this.state.loading ? 'Loading...' : 'Login with MetaMask'}
        </button>
      </div>
    );
  }
}

export default App;
