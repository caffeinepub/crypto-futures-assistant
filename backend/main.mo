import Map "mo:core/Map";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import List "mo:core/List";
import Runtime "mo:core/Runtime";
import OutCall "http-outcalls/outcall";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type PatternEntry = {
    symbol : Text;
    signalType : Text;
    occurrenceCount : Nat;
    precedingMoveCount : Nat;
  };

  var patternEntries : [(Text, PatternEntry)] = [];
  let patternMap = Map.empty<Text, PatternEntry>();
  var cachedCoinGeckoPrices : Text = "";

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

  func patternKey(symbol : Text, signalType : Text) : Text {
    symbol # "#" # signalType;
  };

  public shared ({ caller }) func recordSignalObservation(
    symbol : Text,
    signalType : Text,
    precededSignificantMove : Bool,
  ) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can record signal observations");
    };

    let key = patternKey(symbol, signalType);

    let existing = patternMap.get(key);
    let updated : PatternEntry = switch (existing) {
      case (null) {
        {
          symbol;
          signalType;
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

  public query ({ caller }) func getPatternScores(symbol : Text) : async [PatternEntry] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view pattern scores");
    };
    let results = List.empty<PatternEntry>();
    for ((_, entry) in patternMap.entries()) {
      if (entry.symbol == symbol) {
        results.add(entry);
      };
    };
    results.toArray();
  };

  public query ({ caller }) func getAllPatternScores() : async [PatternEntry] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view all pattern scores");
    };
    patternMap.values().toArray();
  };

  public shared ({ caller }) func fetchAndCacheCoinGeckoPrices() : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can fetch and cache CoinGecko prices");
    };
    let url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd";
    let response = await OutCall.httpGetRequest(url, [], transform);
    cachedCoinGeckoPrices := response;
    response;
  };

  public query ({ caller }) func getCoinGeckoPrices() : async Text {
    cachedCoinGeckoPrices;
  };

  public query ({ caller }) func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  public shared ({ caller }) func clear() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can clear pattern data");
    };
    patternMap.clear();
  };
};
