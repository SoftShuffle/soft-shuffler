// Copyright (C) 2024 Soft Shuffle Ltd <https://www.softshuffle.co.uk>
// The following code implements the Soft Shuffle algorithm developed by Dave Coulthurst.
// 
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published
// by the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// 
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.
// 
// It is available at https://github.com/SoftShuffle/soft-shuffler/
// To discuss other licence options for commercial usage contact support@softshuffle.co.uk



// Explanation
// * Deck/pile[0] is the BOTTOM of the deck/pile - to a large extent its an arbitrary choice, as some operations are simpler this way round, 
//   but some would be easier if [0] was the top of the deck. It is the primary design decision and the main thing you need to internalise to understand the code.
// * Given Deck[0]-is-bottom, dealing from a deck is a reverse traverse (from n->0, not 0->n), BUT, the cards on the piles being dealt to will be built up (0->n).
// * The algorithm is combining 2 stages - 1. Creating a randomistion for the deck, and 2. Dealing the original deck m times into the randomised postions.
//
// 1. Creating a randomistion for the deck.
// * We represent our original deck and the randomised deck using a single array thusly:
//    * The POSITION in the array (ie 0 for initialDeck[0]) represents the card in its original position. 
//    * The VALUE at that position (ie the integer value stored at initialDeck[0]) is the position that card needs to end up in.
// * To create this representation (and this is where randomisation actually happens - the rest is just dealing) we use one of the vations of Fisher-Yates from Knuth:
//     * We start with an array a[] of size n with values 0,1,2,3,...,n-1 stored at positions a[0],a[1],a[2],a[3],a[...],a[n-1].
//     * For i from 0 to n-2, j = random integer picked from i <= j < n, a[i] is swapped with a[j].
//     * See https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle for more explanation.
//
// 2. Dealing the original deck m times into the randomised postions.
// * We work with key variables:
//    * Number of cards to be randomised (numCards, set by input).
//    * Number of piles of cards on the mat (numPiles, set by inputs on what spaces are on the mat).
//    * Number of passes of dealing (derived from the above).
//       * We choose to handle 1, 2 or 3 - 2 passes is the ideal (for space and time reasons):
//          * We can perform randomisation in 1 pass iff the numPiles >= numCards.
//          * We can perform randomisation in 2 passes iff the numPiles >= squareRoot(numCards).
//          * We can perform randomisation in 3 passes iff the numPiles >= cubeRoot(numbCards).
//    * The mat has labels A1,A2,A3,A4,B1,B2,B3,B4 (or more for larger mats), but we deal with arrays, and create a mapping function to 
// * For this explanation, consider a 100 card deck with 10 piles for shuffling.
//    * How we deal in the passes is based on the quotient or remainder when dividing the position the card needs to end in by the number of piles.
//       * Reminder of notation: Dividend / divisor = quotient + remainder.
//       * For this example we deliberately use 100 cards / positions and 10 piles as it means the quotient will be 0-9 and the remainder 0-9 when the positions are numbered 0-99.
//          * For even more simplicity, in this example consider the quotient as the 'tens' value and the remaninder the 'ones' of the new position we want a card to end up in.
//          * So if the position the card should end up in is 75, the dividend is 75, the divisor is 10, the quotient is 7 and remainder is 5.
// * Our 100 card / 10 pile combination gives 2 passes.
//    * The first pass takes the initial deck, sorts by remainder into 10 piles of 10 cards, and then stacks those piles back up into an intermediate deck.
//       * Reminder - initialDeck[99] is the top of the deck (so the first card dealt in the first deal).
//       * If we assume initialDeck[99] == 75, we want to deal it to the 5th pile  (75 % 10 = 5).
//       * We calculate an array of all of these newPilePositions based off a remainder function, with newPilePositions[0] being for initialDeck[0], and so on.
//       * We use the array of arrays newDealPiles[10][10], so initialDeck[99] (which is has the value 75) will be pushed into newDealPile[5], assigning newdealPile[5][0] the value 75. 
//       * So newDealPiles[0][0,1,2,3,...,9] could be 60,30,70,...,10, newDealPiles[1][0,1,2,3,...,9] could be 31,81,11,...,41, and so on.
//       * We gather these 'forward' - with the mat its putting the pile in A1 on pile in A2, etc, 
//         but in code its newDealPiles[9][0-9] pushed first, then newDealPiles[8][0-9] to create the intermediateDeck array - remember the bottom of a deck is position 0 (so newDealPiles[0] should be intermediateDeck[90-99]).
//       * So we have an intermediate deck sorted by remainder, that could look something like: 
//          * intermediateDeck[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,...,86,87,88,89,90,91,92,93,94,95,96,97,98,99] = 99, 69, 79, 89, 29, 9, 19, 39, 59, 49, 68, 38, 78, 28, ... , 31, 1, 21, 61, 30, 60, 40, 0, 50, 10, 70, 80, 20, 90
//    * The second pass takes the intermediate deck, and deals it into the final deck.
//       * If we look at the intermediateDeck example above, intermediateDeck[99] = 90, [98] = 20, [97] = 80.
//       * This time round we're using the quotient to pick which pile to deal into (so for intermediateDeck[99] = 90, we want to deal into pile 9).
//       * Other than using the quotient, creating the piles is the same as the first deal.
//       * This leaves us with newDealPiles[0][0,1,2,3,...,9] DEFINITELY being 0,1,2,3,4,...,9, newDealPiles[1][11,12,13] DEFINITELY being 11,12,13,...,19, and so on.
//          * This is the crux of the algorithm and what we're aiming for - you deal the intermediate deck in a way that allows you to do the second deal giving ordered piles.
//          * Its also the reason you need at least root(numCards) piles to do a two pass algorithm - you cant get that without it.
//       * We now just need to collect the piles back up into a finalDeck[] that is fully ordered from 0-99 (remember 0 is the bottom of the deck).
//          * To do this we need to take pile 9, put it on pile 8, through to zero.
//   * Although we use 100 cards / 10 piles to illustarate, 
//
//
// Other notes 
// * For 3 passes, the first pass will deal out the cards into piles that are decks of a size that can then each be dealt in a 2 pass deal.
//    * Hence a 4 pass would be possible with the numPiles >= fouthRoot(numCards), 5 pass with fifthRoot(numCards) and so on, it just isn't particularly practical. 


//Quick and dirty logger functions that can be tweaked later if needed.
function sLog(text, obj){
    console.log(text);
    console.log(obj);
    console.log("\n");
}
function sLog0(text){
    console.log(text);
    console.log("\n");
}

//0-deck-bottomed array (so 0 is the BOTTOM of the deck, n-1 is thre TOP)
class SoftDeck{
  deckSize = 0;
  deck = [];
  
  //We almost always create decks from other decks (or subsets), so require input deck. 
  constructor(newDeckSize, inputDeck, inputDeckOffset){
    this.deckSize = newDeckSize;
    this.deck = Array(this.deckSize);
    for (var i = 0; i < this.deckSize; i++){
      this.deck[i] = inputDeck[i + inputDeckOffset];
    }
  }

  deckSizeGetter(){
    return this.deckSize;
  }

  deckGetter(){
    return this.deck;
  }

  //print a deck to log, prepended by the label.
  printDeck(label){
    sLog(label +  "\ndeckSize is: " + this.deckSize + "\n(Reminder, deck[0] is the bottom of the deck, deck[deckSize - 1] is the top.)", this.deck);
  }


  //Random sampler tester - need to look in console logging for output.
  //We care about (all axes numCards):
  //returnRangeArr [maxValueInRange][returnedValue] -> accumulator (shows trends of returned values when the range changes)
  //positionvalueArr [position][value] -> accumulator  (shows trends of where numbers end up vs where they started)
  //numRejectionArr [maxValueInRange][11?] -> numRejections accumulator (have 10 be 10+ rejections, which should be vanishingly rare.)
  //numPositionSwapped [maxValueInRange] -> number of times each position is swapped.
randomSampleTester(useRejectionSampling, useCryptoRNG){

  //these are relatively small values, real testing use larger
  let testNumCards = 10;
  let outerLoops = 2;
  let innerLoops = 10000;
  let multiPassLoops = 1;
  
  let returnRangeArr = [];
  let positionvalueArr = [];
  let numRejectionArr = [];
  let numPositionSwapped = [];
  
  for(let i = 0; i < testNumCards; i++){
    returnRangeArr[i] = [];
    positionvalueArr[i] = [];
    numRejectionArr[i] = [];
    numPositionSwapped[i] = 0;
    for(let j = 0; j < testNumCards; j++){
      returnRangeArr[i][j] = 0;
      positionvalueArr[i][j] = 0;
      for(let k = 0; k < 11; k++){
          numRejectionArr[i][k] = 0;
      }
    }
  }

  sLog0("RandomSamplingTester ")
  sLog("returnRangeArr: ", returnRangeArr);
  sLog("positionvalueArr", positionvalueArr);
  sLog("numRejectionArr", numRejectionArr);
  sLog("numPositionSwapped", numPositionSwapped);

for(let x = 0; x < outerLoops; x++){
  
  for(let y = 0; y < innerLoops; y++){
      let testDeck = [];
      for(let i = 0; i < testNumCards; i++){
        testDeck[i] = i;
      }

      //Try multi-pass shuffling
      for(let z = 0; z < multiPassLoops; z++){

        //This is essentially randomiseDeck() but with instrumentation
        for (let i = testNumCards - 1; i > 0; i--) {
          //Generate j, where i >= j >= 0
          let j = -1;

          if(useRejectionSampling == true){
            //Rejection Sampling with cryptoRNG 
            let instrumentation = [];
            j = this.rejectionSampleInstrumented(i, instrumentation);
            //instrumentation
            let numRejections = instrumentation[0];
            if(numRejections < 10){
              numRejectionArr[i][numRejections]++;
            } else {
              numRejectionArr[i][10]++;
            }

          } else if (useCryptoRNG == true){
            //Scaled but using cryptoRNG - probably a tiny bit of rounding bias still.
            let randomArray = new Uint16Array(1);
            self.crypto.getRandomValues(randomArray);
            let zeroToOne = randomArray[0] / 65535;
            j = Math.floor(zeroToOne * (Math.floor(i) - Math.ceil(0) + 1) + Math.ceil(0)); 
    
          } else {
              //Fallback use Math.random - possibly useful for debugging or compatibility.
              j = Math.floor(Math.random() * (Math.floor(i) - Math.ceil(0) + 1) + Math.ceil(0)); 
          }

          if(i != j){
            numPositionSwapped[i]++;
            numPositionSwapped[j]++;
          }

          returnRangeArr[i][j]++;

          //Swap
          [testDeck[i], testDeck[j]] = [testDeck[j], testDeck[i]];
          
        }

      }

      for(let i = 0; i < testNumCards; i++){
        positionvalueArr[i][testDeck[i]]++;
      }

    }
    sLog0("RandomSamplingTester loop " + x + " of " + outerLoops );
    sLog0("RandomSamplingTester innerLoops are " + innerLoops + " of " + testNumCards + " cards ");
  }
    sLog0("RandomSamplingTester Results ");
    sLog("returnRangeArr: ", returnRangeArr);
    sLog("positionvalueArr", positionvalueArr);
    sLog("numRejectionArr", numRejectionArr);
    sLog("numPositionSwapped", numPositionSwapped);

}

  // Rejection sampling - generate a random number from a range greater than what is desired, if it's above the range we are interested in, reject it and pick again. 
  // This avoids any biases from wrapping numbers round, division rounding, etc.
  // We only want to sample from the same number of bits as the minimum number required to encode the largest value we want as a possibility.
  // getRandomValues will give us a fixed number of bits (Uint8 / 16 / etc), so we mask any bits above this minimum-largest-needed-bit to achieve that.
  // A future optimisation would be to generate a large array of random numbers and wrap it in a class that can export a stream of only the number of bits needed.
  // The usual Fisher-Yates implementation uses indexes of 0-i, so we only care about max as the 0 and range are implied.
  // There's a bit of subtlety to the bit twiddling going on here, and I think the simplest way to make it understandable is to include a small table
  // of relevant logs, powers, encodings, etc.
  //
  //  x
  //  		0,			1,			2,			3,			4,			5,			6,			7,			  8,			  9,			  10
  //
  //  Binary representation of x with unsigned int with LSB on the right (technically this would be a uint4)
  //      0000,		0001,		0010,		0011,		0100,		0101,		0110,		0111,		  1000,		  1001,		  1010
  //
  //  Log2(x) (rounded to 1 decimal place)
  //      -		  	0, 			1,			1.6,		2, 	  	2.3,		2.6,		2.8,			3,			  3.2,			3.3
  //
  //  Minimum number bits needed to encode the value x (assuming unsigned int this is Log2(x + 1) ).
  //      1,			1,			2,			2,			3,			3,			3,			3,			  4,			  4,			  4		
  //
  //  2 ^ x
  //      1,			2,			4,			8,			16,			32,			64,			128,			256,			512,			1024
  //
  //  Max value x bits can encode (assuming unsigned, which starts at 0, this is (2 ^ x) - 1  ).
  //      -			  1,			3,			7,			15,			31,			63,			127,			255,			511,			1023	
  //
  rejectionSample(maxValueInRange){
    
    let minNumBitsNeeded = Math.ceil(Math.log2(maxValueInRange + 1));
    let mask = Math.pow(2, minNumBitsNeeded) - 1;

    while(true){
      //For now we'll do them individually - masking should give us less than 50/50 rejection   
      //Uint16 because Uint8 is 0-255, 16 is 0 - 65535.
      let randomArray = new Uint16Array(1);
      self.crypto.getRandomValues(randomArray);
      
      let masked = randomArray[0] & mask;

      if(masked <= maxValueInRange)
      {
        return masked;
      }
    }
  }
//Check identical to above except for added instrumentation - lack of function overloading in JS.
  rejectionSampleInstrumented(maxValueInRange, instrumentation){
    
    let minNumBitsNeeded = Math.ceil(Math.log2(maxValueInRange + 1));
    let mask = Math.pow(2, minNumBitsNeeded) - 1;

    let numRejections = 0; //Instrumentation
    while(true){
      //For now we'll do them individually - masking should give us less than 50/50 rejection   
      //Uint16 because Uint8 is 0-255, 16 is 0 - 65535.
      let randomArray = new Uint16Array(1);
      self.crypto.getRandomValues(randomArray);
      
      let masked = randomArray[0] & mask;

      if(masked <= maxValueInRange)
      {
        instrumentation[0] = numRejections; //Instrumentation
        return masked;
      }
      numRejections++; //Instrumentation
    }
  }



  //Use Fisher-Yates to randomise
  //Use rejectionSampling and cryptoRNG by default - to turn off needs bool setting in code - there in case of compatability issues down the road.
  //Use j = Math.floor(zeroToOneRNG * (maxNumFloored - minNumCeiled + 1) + minNumCeiled) to ensure inclusive of 0 & i.
  randomiseDeck(useCryptoRNG, useRejectionSampling) {

    for (let i = this.deckSize - 1; i > 0; i--) {
      let j = -1;

      if(useRejectionSampling == true){
        //Rejection Sampling with cryptoRNG 
        j = this.rejectionSample(i);

      } else if (useCryptoRNG == true){
        //Scaled but using cryptoRNG - probably a tiny bit of rounding bias still.
        let randomArray = new Uint16Array(1);
        self.crypto.getRandomValues(randomArray);
        let zeroToOne = randomArray[0] / 65535;
        j = Math.floor(zeroToOne * (Math.floor(i) - Math.ceil(0) + 1) + Math.ceil(0)); 

      } else {
        //Fallback use Math.random - possibly useful for debugging or compatibility.
        j = Math.floor(Math.random() * (Math.floor(i) - Math.ceil(0) + 1) + Math.ceil(0)); 
      }

      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  applyFuncToDeck(decisionFunc, numPiles){
    const output = Array(this.deckSize).fill(-1);
    for (let i = 0; i < this.deckSize; i++){
      output[i] = decisionFunc(this.deck[i], numPiles);
    }
    return output;
  }
}

// deckOrderedPilesToDealTo is 0-bottomed (so 0 is the instruction for the bottom of the deck to match SoftDecks)
// dealOrderedPilesToDealTo is that reversed, so we can iterate through them normally (from [0] forward)) - 
// useful for mapping out the instructions to the user.
class SoftInstructions{
  numInstructions = -1;
  deckOrderedPilesToDealTo = [];
  dealOrderedPilesToDealTo = [];
  gatherDealForward = true;

  constructor(numInstructions, deckOrderedPilesToDealTo, gatherDealForward){
    this.numInstructions = numInstructions;
    this.gatherDealForward = gatherDealForward;
    this.deckOrderedPilesToDealTo = Array(this.numInstructions).fill(-1);
    for( let i = 0; i< this.numInstructions; i++){
      this.deckOrderedPilesToDealTo[i] = deckOrderedPilesToDealTo[i];
    }
    for(let i = this.numInstructions - 1; i >= 0; i--){
      this.dealOrderedPilesToDealTo.push(this.deckOrderedPilesToDealTo[i]);
    }
  }

  printInstructions(label){
    sLog(label +  "\n numInstructions is: " + this.numInstructions + ", gatherDealForward is: " + this.gatherDealForward + "\nThis is the DECK ordered version (0-bottomed to match the deck)\n", this.deckOrderedPilesToDealTo);
    sLog(label +  "\n numInstructions is: " + this.numInstructions + ", gatherDealForward is: " + this.gatherDealForward + "\nThis is the DEAL ordered version (reversed to match the order performed physically.)\n", this.dealOrderedPilesToDealTo);
  }

  dealOrderedPilesGetter(){
    return this.dealOrderedPilesToDealTo;
  }

  numInstrGetter(){
    return this.numInstructions;
  }

  gatherDealForwardGetter(){
    return this.gatherDealForward;
  }

  //deckOrderedPilesToDealTo designed to map directly
  applyInstrToDeck(inputDeck, numPiles){
    const deckSize = inputDeck.deckSizeGetter();
    const inputDeckArray = inputDeck.deckGetter();
    const outputDeckArray = [];
    const pileArray = [];
    for (let i = 0; i < numPiles; i++){
      pileArray[i] = [];
    } 


    //Deal from the top of the deck onto piles (remember decks are 0-bottomed, so are piles.)
    for(let i = deckSize - 1; i >= 0; i--){
      pileArray[this.deckOrderedPilesToDealTo[i]].push(inputDeckArray[i]);
    }
    sLog("Applied instructions, dealt to piles (remember we deal from the top of the deck, which is n-1, not 0):", pileArray);

    //$gatherDealForward represents which way we collect the piles. We refer to the final pile (num_piles-1) as n.
    //$gatherDealForward == true is 'Place pile 0 on pile 1, that pile on pile 2, etc' 
    //$gatherDealForward == false is 'Place pile n on pile n-1, that pile on the previous, etc'
    //Because we are push()ing to create the return deck, piling forward means push()ing the last pile first
    //But within each individual we don't change order so we push() them into the final array to avoid changing the order.
    if(this.gatherDealForward){
      for(let i = numPiles - 1; i >= 0; i--){
        for(let j = 0; j < pileArray[i].length; j++){
          outputDeckArray.push(pileArray[i][j]);
        }
      }
    } else {
      for(let i = 0; i < numPiles; i++){
        for(let j = 0; j < pileArray[i].length; j++){
          outputDeckArray.push(pileArray[i][j]);
        }
      }
    }
    sLog("Piles gathered (gatheredForward = " + this.gatherDealForward + "), remember the order of the cards within the pile doesn't change, they are just gathered into a pile.", outputDeckArray);

    return outputDeckArray;
  }

}

// Mat holds the lables of the mat, and is responsible for translating 0-deck-bottomed instructions 
// to real labels. Mat is 0-top-left (position 0 of the array is the top left of the virtual representation).
// Mat is numbered left to right and top to bottom 
// (so in a 2x2 mat [0] is A1, [1] is A2, [2] is B1, [3] is B4 - before any remapping.)
class SoftMat{

  matMappings = [];

  numCards = -1;
  numRows = -1;
  numColumns = -1;
  numCardsPerDeal = -1;

  constructor(numCards, numRows, numColumns, numCardsPerDeal){
    this.numCards = numCards;
    this.numRows = numRows;
    this.numColumns = numColumns;
    this.numCardsPerDeal = numCardsPerDeal;
    //Find 'A'
    let asciiAVal = 'A'.charCodeAt();
    this.matMappings = [];
    for (let i = 0; i < this.numRows; i++){
        let currentLetter = String.fromCharCode(asciiAVal+i);
        for (let j = 1; j <= this.numColumns; j++)
        {
            this.matMappings.push(currentLetter + j);
        }
    }
  }

  printMat(){
    sLog("Mat mappings (the text labels on the mat expressed as an array):\n", this.matMappings);
  }

  //The instructions to gather the piles have to explain what order to gather up the cards.
  createGatherInstructionString(gatherPilesForwards){
    if(gatherPilesForwards){
        let returnString = "\nGather the piles from top left: \n\n" + 
        "Place pile " + this.matMappings[0] + " on " + this.matMappings[1] + ". \n\n"; 
        if(this.numCards > 2){
            returnString = returnString + "Place " + this.matMappings[0] + "+" + this.matMappings[1] + 
            " pile on " + this.matMappings[2] + ". \n\nAnd so on.";
        }
            return returnString;
    } else {
        let last = this.matMappings.length-1;
        let returnString = "\nGather the piles from bottom right: \n\n" + 
        "Place pile " + this.matMappings[last] + " on " + this.matMappings[last-1] + ". \n\n"; 
        if(this.numCards > 2){
            returnString = returnString + "Place " + this.matMappings[last] + "+" + this.matMappings[last-1] + 
            " pile on " + this.matMappings[last-2] + ". \n\nAnd so on.";
        }
            return returnString;
    }
  }

  splitByNumPerDeal(dealInstructions){
      const splitInstructions = [];
      let numDealThisLoop = this.numCardsPerDeal;
      let numDealFinalLoop = this.numCardsPerDeal;
  
      //If we have less than numCardsPerDeal in the final set
      if( (this.numCards % this.numCardsPerDeal) != 0 ){
          numDealFinalLoop = this.numCards % this.numCardsPerDeal;
      }
  
      for(let i = 0; i < this.numCards / this.numCardsPerDeal; i ++){
          let thisSplit = "\n";
              
          if(i >= ( this.numCards / this.numCardsPerDeal - 1 )){
              numDealThisLoop = numDealFinalLoop;
          }
          for(let j = 0; j < numDealThisLoop; j++){
              if( j > 0 ){
                  if( j % 5 == 0){
                      thisSplit = thisSplit + "\n\n";
                  } else {
                      // The spacing is a regular space and an &emsp 
                      thisSplit = thisSplit  + "  ";
                  }
              }
              thisSplit = thisSplit + dealInstructions[(i*this.numCardsPerDeal)+j];
          }
          splitInstructions.push(thisSplit);
      }
      return splitInstructions;
  }

  //Take virtual instructions and combine them with the mat configuration to create output
  mapInstructionsToMat(inputInstr){
    let dealOrderedPilesToDealTo = inputInstr.dealOrderedPilesGetter();
    let numInstr = inputInstr.numInstrGetter();
    let gatherDealForward = inputInstr.gatherDealForwardGetter();
    let unchoppedInstr = [];

    for(let i = 0; i < numInstr; i++){
      unchoppedInstr[i] = this.matMappings[dealOrderedPilesToDealTo[i]];
    }
    //sLog("Unchopped mat instructions", unchoppedInstr);

    let choppedInstr = this.splitByNumPerDeal(unchoppedInstr);
    //sLog("Chopped mat instructions", choppedInstr);

    let outputInstr = choppedInstr;
    outputInstr.push(this.createGatherInstructionString(gatherDealForward));
    //sLog("Instructions mapped to mat, split by number of rows of instructions + gather text", outputInstr);

    return outputInstr;
  }

}


class SoftShuffle{
    //class fields
    numPasses = -1;
    numInstrPerRow = 5;
    //This should be more than needed
    maxPasses = 10;

    //Limits from page
    numCardsMin = -1;
    numCardsMax = -1;
    numRowsMin = -1;
    numRowsMax = -1;
    numColumnsMin = -1;
    numColumnsMax = -1;
    numInstrRowsMin = -1;
    numInstrRowsMax = -1;

    //We should always be using these, but if there are compatibility issues we can disable.
    useRejectionSampling = true;
    useCryptoRNG = true;
    
    deckMatComboMessage = "";
    mainInstructionOutput = [];
    mainInstructionOutputPos = 0;
    
    boxOutput = function(){};
    
    numCardsGetter = function(){};
    numColumnsGetter = function(){};
    numRowsGetter = function(){};
    numInstrRowsGetter = function(){};

    constructor(iBoxOutput, iNumCardsGetter, numCardsMin, numCardsMax, 
                            iNumColumnsGetter, numColumnsMin, numColumnsMax, 
                            iNumRowsGetter, numRowsMin, numRowsMax, 
                            iNumInstrRowsGetter, numInstrRowsMin, numInstrRowsMax){
        //Set function pointers to the version included for this platform.
        this.boxOutput = iBoxOutput;
        this.numCardsGetter = iNumCardsGetter;
        this.numColumnsGetter = iNumColumnsGetter;
        this.numRowsGetter = iNumRowsGetter;
        this.numInstrRowsGetter = iNumInstrRowsGetter;

        //get min/maxs from page.
        this.numCardsMin = numCardsMin;
        this.numCardsMax = numCardsMax;
        this.numColumnsMin = numColumnsMin;
        this.numColumnsMax = numColumnsMax;
        this.numRowsMin = numRowsMin;
        this.numRowsMax = numRowsMax;
        this.numInstrRowsMin = numInstrRowsMin;
        this.numInstrRowsMax = numInstrRowsMax;

        //get variable defaults from page.
        this.getParseInputs();

        //Set initial outputs
        this.resetOutput();
    }

    resetOutput(){
        this.deckMatComboMessage = "";
        this.mainInstructionOutput = ["Instructions are displayed here."];
        this.mainInstructionOutputPos = 0;
    }

    //Used to abstract button clicking functions from the behaviour.
    checkSettingsButtonClick(){
      sLog0("Clicked CheckSettings button");
      this.resetOutput();
      this.getParseInputs();
    }
     randomiseButtonClick(){
        sLog0("Clicked randomise button");
        this.performRandomisation();
    }
    previousButtonClick(){
        sLog0("Clicked Prev button");
        //Check a randomisation has happened succesfully
        if(this.mainInstructionOutput.length > 1){
            if(this.mainInstructionOutputPos - 1 >= 0){
                this.mainInstructionOutputPos--;
                this.boxOutput(this.mainInstructionOutputPos + ".", this.mainInstructionOutput[this.mainInstructionOutputPos]);
            }
        }    
    }
    nextButtonClick(){
        sLog0("Clicked Next button");
        //Check a randomisation has happened succesfully
        if(this.mainInstructionOutput.length > 1){
            if(this.mainInstructionOutputPos + 1 < this.mainInstructionOutput.length){
                this.mainInstructionOutputPos++;
                this.boxOutput(this.mainInstructionOutputPos + ".", this.mainInstructionOutput[this.mainInstructionOutputPos]);
            }
        }    
    }
    beginningButtonClick(){
        sLog0("Clicked Beginning button");
        //Check a randomisation has happened succesfully
        if(this.mainInstructionOutput.length > 1){
            this.mainInstructionOutputPos = 0;
            this.boxOutput(this.mainInstructionOutputPos + ".", this.mainInstructionOutput[this.mainInstructionOutputPos]);
        }
    }

    //Get the inputs from the page.
    //Calculate intermediate values.
    // Error check
    getParseInputs(){
        this.numCards = this.numCardsGetter();
        this.numColumns = this.numColumnsGetter();
        this.numRows = this.numRowsGetter();
        let numInstrRows = this.numInstrRowsGetter();
        this.numCardsPerDeal = numInstrRows * this.numInstrPerRow;
        this.numPiles = this.numColumns * this.numRows;
        this.numPasses = this.findNumPasses(this.numCards, this.numPiles);

        let returnBool = true;

        if (this.numCards < this.numCardsMin || this.numCards > this.numCardsMax
          || this.numColumns < this.numColumnsMin || this.numColumns > this.numColumnsMax
          || this.numRows < this.numRowsMin || this.numRows > this.numRowsMax
          || this.numInstrRows < this.numInstrRowsMin || this.numInstrRows > this.numInstrRowsMax){

            this.deckMatComboMessage = "";
            this.deckMatComboMessage += "Current Settings are outside allowed values.\n\n";
            this.deckMatComboMessage += "Adjust the settings above, then click 'Check Settings' to test.\n\n";
            returnBool = false;
          } else if(this.numPasses == -1){
            this.deckMatComboMessage = "";
            this.deckMatComboMessage += "Too many passes needed (more than " + this.maxPasses + ").\n\n";
            this.deckMatComboMessage += "Adjust the settings above, then click 'Check Settings' to test.\n\n";
            returnBool = false;
          } else {
          //Basically - 1 or 2 passes is Good, 3 is Ok, 4+ Bad.
          let settingsAssessment = "GOOD";
          if(this.numPasses > 2){
            settingsAssessment = "OK";
          }
          if(this.numPasses > 3){
            settingsAssessment = "POOR";
          }

          this.deckMatComboMessage = "";
          this.deckMatComboMessage += "- Adjust the settings above, then click 'Check Settings' to test (full instructions below/left).\n\n"

          //this.deckMatComboMessage += "(Instructions below/left)\n\n";
          this.deckMatComboMessage += "- Current Settings: " + settingsAssessment + "\n";
          this.deckMatComboMessage += "(" + this.numCards + " cards randomised in " + this.numPasses + " deals.)\n";
          this.deckMatComboMessage += "(Mat spaces used (W*H): [" + this.numColumns + "*" + this.numRows + "].)\n\n";

          this.deckMatComboMessage += "- Click 'Randomise Deck' to use these settings.\n\n";
          
          //this.deckMatComboMessage += "Otherwise adjust the settings above, then click 'Check Settings' to test.\n\n"

          this.deckMatComboMessage += "- Info:\n"
          this.deckMatComboMessage += "* [" + this.numColumns + " * " + this.numRows + "] mat spaces gives a total of " + this.numPiles + " piles.\n";
          this.deckMatComboMessage += "* " + Math.ceil(Math.sqrt(this.numCards)) + "+ piles needed for 2 pass for " + this.numCards + " cards.\n";
          this.deckMatComboMessage += "* " + Math.ceil(Math.cbrt(this.numCards)) + "+ piles needed for 3 pass for " + this.numCards + " cards.";

        }
        sLog(this.deckMatComboMessage);
        this.boxOutput(this.deckMatComboMessage, "");
        
        return returnBool; 
    }

    //Its useful to be able to speculatively do this as well as in error checking.
    //We manually check powers rather than testing roots to avoid rounding errors.
    //We limit to 5 passes - even 3 should do what any user feasibly wants.
    findNumPasses(numCards, numPiles){
      let accumulator = numPiles;
      let i = 1;
      while(i <= this.maxPasses){
        if(accumulator >= numCards){
          return i;
        } else {
          i++;
          accumulator *= numPiles;
        }
      }
      return -1;
    }

    //Perform a full randomisation.
    //With 1 pass, deal cards to where they are meant to be, and gather.
    //With 2 pass, deal cards to the right piles for a final pass, gather, final pass.
    //Antepenultimate, penultimate, ultimate are the proper terms for thirdToLast, secondToLast and Last, 
    //but are actually longer to write out and lower readability.
    performRandomisation() {
        //Assume user has set inputs by now, but defaults if not.
        if (this.getParseInputs() == false){
          return;
        }
        sLog0("Parsed inputs, no issues found");

        //Set initial outputs
        this.resetOutput();

        //Create Mat representation
        const matMapper = new SoftMat(this.numCards, this.numRows, this.numColumns, this.numCardsPerDeal);
        matMapper.printMat();
        

        //We only create a Deck from nothing this one time - this creates ones with the initial positions matching the array indices - ie unshuffled.
        const initialPositions = [];
        for (let i = 0; i < this.numCards; i++) {
            initialPositions[i] = i;
        }
        const initialDeck = new SoftDeck(this.numCards, initialPositions, 0);
        
        //Perform randomisation
        initialDeck.printDeck("Deck pre-randomisation - unshuffled so card positions match their array index");
        initialDeck.randomiseDeck(this.useCryptoRNG, this.useRejectionSampling);
        initialDeck.printDeck("Deck post-randomisation - array element show the position we wish that card to end up in.");
        sLog0("NOTE! All randomisation has happened now, the rest (and vast majority) of the code is how to generate 1,2 or 3 deals to get the cards to their randomised postions.")


        //NOTE: I've retained the following commented out code to make it easier to understand what's going on here. 
        //It also may be useful for compatibility issue.
        //The functions used to generate the pile each card should be dealt to, expressed as the general case where only the power used in division changes.
        //'UnityQuotientFunc' is really just a remainder function but expressed fully here to show the general case.
        // It simplifies to 'function remainderFunc (newPosition, numPiles) { return newPosition % numPiles; };'
        //Naming is tricky, but for simplicity i've used (for example) 'square' quotient to represent the fact that for 2-pass, the number of cards must be <= square of the number of piles.
        //function unityQuotientFunc (newPosition, numPiles) { return (Math.trunc(newPosition / Math.pow(numPiles, 0)) % numPiles); };
        //function squareQuotientFunc (newPosition, numPiles) { return (Math.trunc(newPosition / Math.pow(numPiles, 1)) % numPiles); };
        //function cubeQuotientFunc (newPosition, numPiles) { return (Math.trunc(newPosition / Math.pow(numPiles, 2)) % numPiles); };
        //function quadQuotientFunc (newPosition, numPiles) { return (Math.trunc(newPosition / Math.pow(numPiles, 3)) % numPiles); };
        //function quintQuotientFunc (newPosition, numPiles) { return (Math.trunc(newPosition / Math.pow(numPiles, 4)) % numPiles); };
        //let functionArray = [unityQuotientFunc, squareQuotientFunc, cubeQuotientFunc, quadQuotientFunc, quintQuotientFunc];
        //General case expressed programatically
        let functionArray = [];
        for(let i = 0; i < this.numPasses; i++){
          function quotientFunction (newPosition, numPiles) { return (Math.trunc(newPosition / Math.pow(numPiles, i)) % numPiles); };
          functionArray[i] = quotientFunction;
        }

        //Gather forwards alternates true / false / true, and starts false if numPasses is odd, true on even.
        //starts true on even.
        let gatherForward = false;
        if (this.numPasses % 2 == 0){
          gatherForward = true;
        }

        let currentDeck = initialDeck;
        let deckArray = [];
        let instrArray = [];
        let mappedInstructions = [];

        //perform the required number of passes (realistically only ever likely to be max 4, but lets people explore the algorithm)
        for(let i = 0; i < this.numPasses; i++){
          //Create the next set of functions based on the quotient function for this iteration / pass
          const newInstr = new SoftInstructions(currentDeck.deckSizeGetter(), currentDeck.applyFuncToDeck(functionArray[i], this.numPiles), gatherForward);
          //newInstr.printInstructions("Pass " + i + " instructions");
  
          //apply the instructions to genenerate the new deck that will be generated once dealing has happened.
          const newDeck = new SoftDeck(currentDeck.deckSizeGetter(), newInstr.applyInstrToDeck(currentDeck, this.numPiles), 0);
          //newDeck.printDeck("New deck after Pass " + i + " instructions applied to it.");

          //Map the instructions to the mat and generate the Strings needed to output.
          const newMappedInstr = matMapper.mapInstructionsToMat(newInstr);
          //sLog("Instructions for Pass " + i + " mapped to mat, split by number of rows of instructions + gather text", newMappedInstr);

          instrArray[i] = newInstr;
          deckArray[i] = newDeck;
          mappedInstructions[i] = newMappedInstr;
          currentDeck = newDeck;

          //flip gatherForward
          if(gatherForward == true){
            gatherForward = false;
          } else {
            gatherForward = true;
          }

        }

        this.mainInstructionOutput = [];
        this.mainInstructionOutput.push("\nVirtual randomisation complete.\n\nClick Next for first deal instruction. ");

        //Log the instructions and new decks 
        for(let i = 0; i < this.numPasses; i++){
          instrArray[i].printInstructions("Pass " + i + " instructions");
          deckArray[i].printDeck("New deck after Pass " + i + " instructions applied to it.");
          sLog("Instructions for Pass " + i + " mapped to mat, split by number of rows of instructions + gather text", mappedInstructions[i]);
  
          for(let j = 0; j < mappedInstructions[i].length; j++){
            this.mainInstructionOutput.push(mappedInstructions[i][j]);
          }
        }

        this.mainInstructionOutput.push("\nDone!\n\nDeck randomised and ready for use. ");

        sLog("Main Instructions\n",this.mainInstructionOutput);

        //This sets to the start of the instructions.
        this.beginningButtonClick();

        //Just for testing
        //initialDeck.randomSampleTester(this.useRejectionSampling, this.useCryptoRNG);
    }
}




