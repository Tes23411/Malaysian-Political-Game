const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const importRegex = /import \{ processAllianceInvite/g;
code = code.replace(importRegex, "import { processBillVote } from './utils/billActions';\nimport { processAllianceInvite");

const oldHandleBillVote = `  const handleBillVote = (playerVote: VoteDirection) => {
      if (!parliamentBill) return;
      
      const tally: BillVoteTally = { Aye: 0, Nay: 0, Abstain: 0 };
      const breakdown: BillVoteBreakdown = new Map();
      const seatCounts = new Map<string, number>();
      parties.forEach(p => seatCounts.set(p.id, 0));
      for (const partyId of electionResults.values()) {
          seatCounts.set(partyId, (seatCounts.get(partyId) || 0) + 1);
      }

      parties.forEach(party => {
          let vote: VoteDirection;
          if (playerParty && party.id === playerParty.id) {
              vote = playerVote;
          } else {
             vote = aiDecideBillVote(party, parliamentBill);
          }
          
          const seats = seatCounts.get(party.id) || 0;
          tally[vote] += seats;
          breakdown.set(party.id, vote);
      });
      
      const totalMembers = allSeatCodes.length; 
      
      let passed = false;
      if (parliamentBill.isConstitutional) {
          passed = tally.Aye >= Math.ceil(totalMembers * 2 / 3);
      } else {
          passed = tally.Aye > tally.Nay;
      }
      
      if (passed) {
          setPassedLaws(prev => [...prev, parliamentBill]);
          if (parliamentBill.id === 'const_prop_rep') {
              setElectionSystem('PR');
              addToLog('Constitutional Amendment', "Proportional Representation Act passed. Future elections will use PR.", 'politics');
          }
      }

      setBillVoteResults({ passed, tally, breakdown });
      setGameState('bill-results');
  };`;

const newHandleBillVote = `  const handleBillVote = (playerVote: VoteDirection) => {
      if (!parliamentBill) return;
      const { passed, tally, breakdown, updatedPassedLaws, updatedElectionSystem, logs } = processBillVote(
          playerVote,
          playerParty?.id,
          parliamentBill,
          parties,
          electionResults,
          allSeatCodes.length,
          passedLaws,
          electionSystem
      );
      
      setPassedLaws(updatedPassedLaws);
      setElectionSystem(updatedElectionSystem);
      logs.forEach(log => addToLog(log.title, log.desc, log.type));
      setBillVoteResults({ passed, tally, breakdown });
      setGameState('bill-results');
  };`;

code = code.replace(oldHandleBillVote, newHandleBillVote);

fs.writeFileSync('App.tsx', code);
