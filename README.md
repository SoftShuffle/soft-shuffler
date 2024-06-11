# Soft Shuffle soft-shuffler - a Digitally Directed Deck Randomiser

An implementation of the soft shuffle method of fully randomising a deck of cards puerely by dealing to a
set of digitally generated instructions. Encapsulated as a single html & javascript webpage to make it easy 
to download to a device for offline use.


# What it does

For more detail on how the algorithm works, see <https://www.softshuffle.co.uk/technical>.

There is also an explainer at the top of the code.

A short summary of what it does:
- An array is created, sized to the match the number of cards, each element storing its index (representing the initial order of the cards).
- Fisher-Yates randomisation <https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle> is performed on that array, generating a new ordering to be dealt to.
    - The `crypto.getRandomValues()` library function is used along with rejection sampling to give unbiased randomisation (we specifically use the crypt library as it mixes entropy from the device in to overcome the issues with PRNGs).
- A set of instructions is generated to allow the specific variation of pile-shuffling (pile-deal is a more accurate term) to be performed by the user.
    - The general case of the algorithm is used that can do 1-n passes (each pass is a deal of a deck to piles then collect back into a deck).
- These deal instructions are separated out into a 2D array representing the blocks/pages they'll be preseneted to the user in, based on the config data collected at the beginning.


# Requirements

ES6 compatible browser.

# Usage

- *Normal Usage:* 
    - Save either `combined_main_page.html` or `main_page.html` & `soft_shuffle.js` locally to the device you wish to run the code from.
    - Open either `combined_main_page.html` or `main_page.html` with a browser. Usage instructions are on the page itself.
- *Debugging / Inspection:* 
    - As above, but enable logging on the browser (the simplest way to do this is a desktop browser).
    - The debug output is reasonably verbose and explains the steps being taken.

# Code

- `soft_shuffle.js` contains the main SoftShuffle class (and a few helper classes). It is the same version used on <https://www.softshuffle.co.uk/shuffle>.
- `main_page.html` contains a simple wrapper html page to present and run an instance of the SoftShuffle class.
- `combined_main_page.html` combines `soft_shuffle.js` and `main_page.html` into a single page to make it easier to download and use on a device.

- - -
Copyright (C) 2024 Soft Shuffle Ltd <https://www.softshuffle.co.uk>.
THe open source version of this project is published under the AGPL3.0 licence, see LICENCE file or <https://fsf.org/>.
To discuss other licence options for commercial usage contact <support@softshuffle.co.uk>
