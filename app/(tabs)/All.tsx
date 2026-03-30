import mqtt from "mqtt";
import React, { useEffect, useRef, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  Alert,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Buffer } from "buffer";
global.Buffer = global.Buffer || Buffer;

const BROKER_WS = "wss://broker.emqx.io:8084/mqtt"; // EMQX websockets endpoint
const TOPIC_LEVEL = "feed/level";
const TOPIC_LAST = "feed/last";
const TOPIC_STATUS = "feed/status";
const TOPIC_MANUAL = "feed/manual";
const TOPIC_SCHEDULE = "feed/schedule";

const makeClientId = () => `rn_feeder_${Math.floor(Math.random() * 1000000)}`;

const SmartFishFeeder = () => {
  const clientRef = useRef(null);

  const [connected, setConnected] = useState(false);
  const [level, setLevel] = useState(null); // percent number 0..100
  const [lastFeed, setLastFeed] = useState(null); // string
  const [status, setStatus] = useState("UNKNOWN");
  const [isFeeding, setIsFeeding] = useState(false);
  const [schedules, setSchedules] = useState([]);

  const [isOnline, setIsOnline] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    const clientId = makeClientId();
    const opts = {
      keepalive: 30,
      clientId,
      protocolId: "MQTT",
      protocolVersion: 4,
      clean: true,
      reconnectPeriod: 4000,
      connectTimeout: 30 * 1000,
    };

    const client = mqtt.connect(BROKER_WS, opts);
    clientRef.current = client;

    client.on("connect", () => {
      console.log("[MQTT] connected");
      setConnected(true);
      // subscribe to topics
      client.subscribe(TOPIC_LEVEL, { qos: 0 }, (err) => {
        if (err) console.warn("subscribe level err", err);
      });
      client.subscribe(TOPIC_LAST, { qos: 0 }, (err) => {
        if (err) console.warn("subscribe last err", err);
      });
      client.subscribe(TOPIC_STATUS, { qos: 0 }, (err) => {
        if (err) console.warn("subscribe status err", err);
      });
      client.subscribe(TOPIC_SCHEDULE, { qos: 0 }, (err) => {
        if (err) console.warn("subscribe status err", err);
      });
    });

    client.on("reconnect", () => {
      console.log("[MQTT] reconnecting...");
      setConnected(false);
    });

    client.on("close", () => {
      console.log("[MQTT] closed");
      setConnected(false);
    });

    client.on("error", (err) => {
      console.warn("[MQTT] error", err);
    });

    client.on("message", (topic, message) => {
      // message is a Buffer
      try {
        const payload = message.toString();
        const data = JSON.parse(payload);

        if (topic === TOPIC_LEVEL && data.level !== undefined) {
          // ensure numeric
          const val = Number(data.level);
          if (!isNaN(val)) {
  const clean = Math.round(Math.max(0, Math.min(100, val)));
  setLevel(clean);
}
        } else if (topic === TOPIC_LAST && data.last_feed) {
          setLastFeed(String(data.last_feed));
        } else if (topic === TOPIC_STATUS && data.status) {
          setStatus(String(data.status));
          // derive feeding indicator
          setIsFeeding(String(data.status).toUpperCase().includes("FEED"));
        } else if (topic === TOPIC_SCHEDULE && data.schedules) {
  setSchedules(data.schedules);
}
      } catch (e) {
        console.warn("[MQTT] parse error", e);
      }
    });

    return () => {
      try {
        client.end(true);
      } catch (e) {}
      clientRef.current = null;
    };
  }, []);

  const publish = (topic, obj) => {
    if (!clientRef.current || !connected) {
      Alert.alert("Not connected", "MQTT broker not connected yet.");
      return;
    }
    try {
      const payload = JSON.stringify(obj);
      clientRef.current.publish(
        topic,
        payload,
        { qos: 0, retain: false },
        (err) => {
          if (err) console.warn("publish err", err);
          else console.log("Published", topic, payload);
        }
      );
    } catch (e) {
      console.warn("publish exception", e);
    }
  };

  const onFeedNow = () => {
    // confirmation
    Alert.alert("Feed Now", "Yakin mau beri makan sekarang?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Ya",
        onPress: () => {
          // publish JSON command
          publish(TOPIC_MANUAL, { command: "ON" });
          // optimistic UI
          setIsFeeding(true);
          setTimeout(() => setIsFeeding(false), 5000); // temporary indicator
        },
      },
    ]);
  };

  const timeAgo = (dateString) => {
  if (!dateString) return "Belum tersedia";

  const now = new Date();
  const last = new Date(dateString);

  const diffMs = now - last;
  const diffMinutes = Math.floor(diffMs / 1000 / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Baru saja";
  if (diffMinutes < 60) return `${diffMinutes} Min Ago`;
  if (diffHours < 24) return `${diffHours} Hours Ago`;
  return `${diffDays} Days Ago`;
};


  // Simulate last feed time and next feed calculation
  const lastFeedTime = new Date();
  lastFeedTime.setMinutes(lastFeedTime.getMinutes() - 10); // 10 mins ago
  const getNextFeed = () => {
  if (!schedules || schedules.length === 0) return null;

  const now = new Date();

  // convert schedule ke Date hari ini
  const todaySchedules = schedules.map((s) => {
    const d = new Date();
    d.setHours(s.hour, s.minute, 0, 0);
    return d;
  });

  // cari yang masih di depan waktu sekarang
  let next = todaySchedules.find((t) => t > now);

  // kalau tidak ada → ambil jadwal pertama besok
  if (!next) {
    next = new Date(todaySchedules[0]);
    next.setDate(next.getDate() + 1);
  }

  return next;
};

const getNextFeedText = () => {
  const next = getNextFeed();
  if (!next) return "No schedule";

  const now = new Date();
  const diffMs = next - now;

  const diffMinutes = Math.floor(diffMs / 1000 / 60);
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  return `In ${hours} Hours ${minutes} Minutes`;
};
  

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.locationContainer}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.locationText}>SMAN 1 MALANG</Text>
          </View>
          <View style={styles.iconContainer}>
            <Text style={styles.fishIcon}>🎣</Text>
          </View>
        </View>

        {/* Main Card */}
        <View style={styles.mainCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Smart Fish Feeder</Text>
            <TouchableOpacity style={styles.dashboardButton}>
              <Text style={styles.dashboardButtonText}>Dashboard</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statusBox}>
            <Text style={styles.statusTitle}>Status</Text>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabelOnline}>Online</Text>
              {/* <Switch value={isOnline} onValueChange={setIsOnline} /> */}
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabelIdle}>{status}</Text>
              <View
                style={[
                  {
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                  },
                  {
                    backgroundColor: isFeeding
                      ? "#f39c12"
                      : connected
                      ? "#2ecc71"
                      : "#e74c3c",
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Search and filter */}
        <View style={styles.searchSection}>
          <TextInput
            placeholder="Search..."
            value={searchText}
            onChangeText={setSearchText}
            style={styles.searchInput}
          />
          {/* <TouchableOpacity style={styles.filterButton}>
            <Text style={{ fontSize: 20 }}>⚙️</Text>
          </TouchableOpacity> */}
        </View>

        {/* Tabs */}
        {/* <View style={styles.tabContainer}>
          {['All', 'Schedule', 'Activity', 'Monitoring'].map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setSelectedTab(tab)}
              style={[
                styles.tab,
                selectedTab === tab && styles.tabSelected,
              ]}>
              <Text
                style={[
                  styles.tabText,
                  selectedTab === tab && { color: 'white', fontWeight: '700' },
                ]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View> */}

        {/* Food Level */}
        <View style={{ marginTop: 10 }}>
          <Text style={styles.sectionTitle}>Food Level</Text>
          <View style={styles.progressBackground}>
            <View style={[styles.progressFill, { width: `${level}%` }]}>
              <Text style={styles.progressText}>{level}%</Text>
            </View>
          </View>
          <Text style={styles.attentionText}>
            Attention: immediately refill if it is 10% or below!
          </Text>
        </View>

        {/* Last Feed and Action */}
        <View style={styles.bottomTitle}>
        <Text style={styles.botTitle1}>Last Feed</Text>
        <Text style={styles.botTitle2}>Action</Text>
        </View>
        <View style={styles.bottomSection}>
          {/* Last Feed */}
          <View style={styles.lastFeedBox}>
            <View style={styles.lastFeedTopRow}>
              <View style={styles.lastFeedBadge}>
                <Text style={styles.lastFeedBadgeText}>{timeAgo(lastFeed)}</Text>
              </View>
              <View style={styles.lastFeedBadgeAuto}>
                <Text style={styles.lastFeedBadgeText}>Manual</Text>
              </View>
            </View>
            <Text style={styles.feedTime}>
              {lastFeed || "Belum tersedia"}
            </Text>
            <Text style={styles.nextFeed}>
              Next Feed:
              {"\n"}
              <Text style={{ fontWeight: "900" }}>
                {getNextFeedText()}
              </Text>
            </Text>
            <Text style={styles.feedingSchedule}>
              Feeding Schedule
              <Text style={{ fontWeight: "700", fontSize: 18 }}> →</Text>
            </Text>
          </View>

          {/* Action */}
          <View style={styles.actionBox}>
            <Text style={styles.actTitle}>Manual Feeding</Text>
            <TouchableOpacity style={styles.feedNowButton} onPress={onFeedNow}>
              <Text style={styles.feedNowButtonText}>Feed Now</Text>
            </TouchableOpacity>
            <Text style={styles.subText}>For 1x feed portion</Text>

            {/* <TouchableOpacity style={styles.tapHoldButton}>
              <Text style={styles.tapHoldButtonText}>Tap and Hold</Text>
            </TouchableOpacity> */}
            <Text style={styles.subText}> </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const blueColor = "#214DE0";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e9ecf6",
  },
  header: {
    backgroundColor: blueColor,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingVertical: 40,
    paddingBottom: 80,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationIcon: {
    fontSize: 18,
    color: "white",
  },
  locationText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
  iconContainer: {
    backgroundColor: "#1646C8",
    padding: 5,
    borderRadius: 10,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  fishIcon: {
    fontSize: 25,
    color: "white",
  },
  mainCard: {
    backgroundColor: "white",
    marginHorizontal: 20,
    borderRadius: 15,
    padding: 20,
    flexDirection: "row",
    marginTop: -40,
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontWeight: "700",
    fontSize: 24,
    color: blueColor,
    marginBottom: 10,
  },
  dashboardButton: {
    backgroundColor: blueColor,
    paddingVertical: 7,
    paddingLeft: 25,
    marginRight: 30,
    borderRadius: 15,
  },
  dashboardButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  statusBox: {
    backgroundColor: blueColor,
    borderRadius: 15,
    width: 140,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statusTitle: {
    color: "white",
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
    fontSize: 16,
  },
  statusRow: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 5,
  },
  statusLabelOnline: {
    color: "#1646C8",
    fontWeight: "700",
  },
  statusLabelIdle: {
    color: "#1646C8",
    fontWeight: "600",
    marginVertical: 2,
  },
  statusIndicator: {
    width: 15,
    height: 15,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "white",
  },
  searchSection: {
    marginHorizontal: 20,
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    backgroundColor: "white",
    flex: 1,
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 45,
    fontSize: 14,
    fontWeight: "500",
  },
  filterButton: {
    marginLeft: 15,
    backgroundColor: "white",
    paddingVertical: 7,
    paddingHorizontal: 15,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 15,
  },
  tab: {
    marginRight: 20,
    paddingVertical: 6,
  },
  tabSelected: {
    borderRadius: 20,
    backgroundColor: blueColor,
    paddingHorizontal: 14,
  },
  tabText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#2F2F2F",
  },
  sectionTitle: {
    fontWeight: "700",
    fontSize: 18,
    marginLeft: 20,
    marginBottom: 10,
    marginTop: 10,
    color: blueColor,
  },
  progressBackground: {
    marginHorizontal: 20,
    backgroundColor: "#BBC9F7",
    borderRadius: 40,
    height: 35,
    justifyContent: "center",
  },
  progressFill: {
    backgroundColor: blueColor,
    height: 35,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  progressText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  attentionText: {
    color: blueColor,
    fontWeight: "600",
    marginLeft: 20,
    marginTop: 5,
    fontSize: 13,
  },
  bottomSection: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 40,
    justifyContent: "space-between",
  },
  bottomTitle: {
    flexDirection: "row",
    marginHorizontal: 60,
    marginTop: 20,
    justifyContent: "space-between",
  },
  lastFeedBox: {
    backgroundColor: blueColor,
    borderRadius: 15,
    gap: 4,
    width: "48%",
    padding: 15,
  },
  lastFeedTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  lastFeedBadge: {
    backgroundColor: "#3078F6",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  lastFeedBadgeAuto: {
    backgroundColor: "#0738B3",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  lastFeedBadgeText: {
    color: "white",
    fontWeight: "700",
    fontSize: 12,
  },
  feedTime: {
    fontWeight: "400",
    backgroundColor: "white",
    borderRadius: 6,
    padding: 1,
    textAlign: "center",
    paddingHorizontal: 4,
    fontSize: 13,
    color: "#0738B3",
  },
  nextFeed: {
    marginTop: 5,
    fontWeight: "600",
    fontSize: 16,
    color: "white",
  },
  feedingSchedule: {
    marginTop: 10,
    fontWeight: "800",
    fontSize: 13,
    color: "white",
  },
  actionBox: {
    backgroundColor: blueColor,
    borderRadius: 15,
    justifyContent: 'center',
    width: "48%",
    padding: 15,
    alignItems: "center",
  },
  feedNowButton: {
    backgroundColor: "white",
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 25,
    marginBottom: 5,
    marginTop: 10,
    width: "100%",
  },
  feedNowButtonText: {
    color: blueColor,
    fontWeight: "700",
    textAlign: "center",
    fontSize: 16,
  },
  subText: {
    color: "white",
    fontWeight: "600",
    fontSize: 12,
    marginBottom: 10,
    textAlign: "center",
  },
  actTitle: {
    color: "white",
    fontWeight: "800",
    fontSize: 18,
    marginBottom: 10,
    textAlign: "center",
  },
  botTitle1: {
    color: blueColor,
    fontWeight: "800",
    fontSize: 20,
    textAlign: "center",
  },
  botTitle2: {
    color: blueColor,
    fontWeight: "800",
    fontSize: 20,
    marginRight: 10,
    textAlign: "center",
  },
  tapHoldButton: {
    backgroundColor: "#1646C8",
    borderRadius: 15,
    paddingVertical: 10,
    paddingHorizontal: 25,
    marginBottom: 5,
    width: "100%",
  },
  tapHoldButtonText: {
    color: "white",
    fontWeight: "700",
    textAlign: "center",
    fontSize: 16,
  },
});

export default SmartFishFeeder;
