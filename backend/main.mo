import Int "mo:core/Int";
import Map "mo:core/Map";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Float "mo:core/Float";
import Char "mo:core/Char";
import Prim "mo:prim";
import List "mo:core/List";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import OutCall "http-outcalls/outcall";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type SignalType = Text;

  public type PatternEntry = {
    symbol : Text;
    signalType : SignalType;
    occurrenceCount : Nat;
    precedingMoveCount : Nat;
  };

  var patternEntries : [(Text, PatternEntry)] = [];
  let patternMap = Map.empty<Text, PatternEntry>();

  system func preupgrade() {
    patternEntries := patternMap.entries().toArray();
  };

  system func postupgrade() {
    patternMap.clear();
    for ((k, v) in patternEntries.vals()) {
      patternMap.add(k, v);
    };
    patternEntries := [];
  };

  func patternKey(symbol : Text, signalType : SignalType) : Text {
    symbol # "#" # signalType;
  };

  public shared ({ caller }) func recordSignalObservation(
    symbol : Text,
    signalType : SignalType,
    precededSignificantMove : Bool,
  ) : async () {
    let key = patternKey(symbol, signalType);

    let existing = patternMap.get(key);
    let updated : PatternEntry = switch (existing) {
      case null {
        {
          symbol = symbol;
          signalType = signalType;
          occurrenceCount = 1;
          precedingMoveCount = if (precededSignificantMove) { 1 } else { 0 };
        };
      };
      case (?entry) {
        {
          symbol = entry.symbol;
          signalType = entry.signalType;
          occurrenceCount = entry.occurrenceCount + 1;
          precedingMoveCount = entry.precedingMoveCount + (if (precededSignificantMove) { 1 } else { 0 });
        };
      };
    };
    patternMap.add(key, updated);
  };

  public query func getPatternScores(symbol : Text) : async [PatternEntry] {
    let results = List.empty<PatternEntry>();
    for ((key, entry) in patternMap.entries()) {
      if (entry.symbol == symbol) {
        results.add(entry);
      };
    };
    results.toArray();
  };

  public query func getAllPatternScores() : async [PatternEntry] {
    patternMap.values().toArray();
  };

  var cachedCoinGeckoPrices : Text = "";

  public shared ({ caller }) func fetchAndCacheCoinGeckoPrices() : async Text {
    let url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd";
    let result = await OutCall.httpGetRequest(url, [], transform);
    cachedCoinGeckoPrices := result;
    result;
  };

  public query func getCoinGeckoPrices() : async Text {
    cachedCoinGeckoPrices;
  };

  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  public shared ({ caller }) func clear() : async () {
    patternMap.clear();
  };
};
