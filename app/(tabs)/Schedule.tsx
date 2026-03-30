// import React, { useState, useEffect } from "react";
// import { FlatList, SafeAreaView, TouchableOpacity, TextInput, StyleSheet,Button, Text, View } from "react-native";
// import DateTimePicker from '@react-native-community/datetimepicker';
// import mqtt from 'mqtt';

// const client = mqtt.connect('ws://broker.emqx.io:8083/mqtt', {
//   clientId: 'rn_fish_' + Math.random().toString(16).substr(2, 8),
// });

// const ScheduleOnlyScreen = () => {
//   const [searchText, setSearchText] = useState("");
//   const [selectedTab, setSelectedTab] = useState("Schedule");

//   const scheduleData = [
    
//   ];

//   // Filter data berdasarkan searchText (pada time dan description)
//   const filteredData = scheduleData.filter(
//     (item) =>
//       item.time.includes(searchText) ||
//       item.description.toLowerCase().includes(searchText.toLowerCase())
//   );

//   const [schedules, setSchedules] = useState([]);
//   const [showPicker, setShowPicker] = useState(false);
//   const [time, setTime] = useState(new Date());

//   useEffect(() => {
//     client.on('connect', () => console.log('MQTT Connected'));
//     return () => client.end();
//   }, []);

//   const addSchedule = (event, date) => {
//     setShowPicker(false);
//     if (!date) return;

//     setSchedules(prev => [
//       ...prev,
//       { hour: date.getHours(), minute: date.getMinutes() }
//     ]);
//   };

//   const sendSchedule = () => {
//     client.publish('feed/schedule', JSON.stringify({ schedules }));
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       {/* Header */}
//        <Text
//         style={{
//           fontWeight: "700",
//           fontSize: 30,
//           textAlign:'center',
//           color: blueColor,
//           marginBottom: 10,
//           marginTop: 30,
//         }}
//       >
//         SCHEDULE
//       </Text> 
//       <View style={{ padding: 20 }}>
//       <Button title="Tambah Jadwal" onPress={() => setShowPicker(true)} />

//       {showPicker && (
//         <DateTimePicker
//   value={time} // ✅ WAJIB
//   mode="time"
//   is24Hour={true}
//   display="default"
//   onChange={(event, selectedDate) => {
//     if (selectedDate) {
//       setTime(selectedDate);
//       addSchedule(event, selectedDate);
//     } else {
//       setShowPicker(false);
//     }
//   }}
// />
//       )}

//       {schedules.map((item, i) => (
//         <Text key={i}>
//           {item.hour.toString().padStart(2, '0')}:
//           {item.minute.toString().padStart(2, '0')}
//         </Text>
//       ))}

//       <Button title="Kirim ke ESP32" onPress={sendSchedule} />
//     </View>
//       <View style={styles.headerRow}>
//         <TextInput
//           style={styles.searchInput}
//           placeholder="Search..."
//           value={searchText}
//           onChangeText={setSearchText}
//         />
//         {/* <TouchableOpacity style={styles.iconButton}>
//           <Text style={{ fontSize: 24 }}>📡</Text>
//         </TouchableOpacity> */}
//       </View>

//       {/* Tabs */}
//       {/* <View style={styles.tabsRow}>
//         {['All', 'Schedule', 'Activity', 'Monitoring'].map(tab => (
//           <TouchableOpacity
//             key={tab}
//             style={[
//               styles.tab,
//               selectedTab === tab && styles.tabSelected,
//             ]}
//             onPress={() => setSelectedTab(tab)}
//           >
//             <Text style={[
//               styles.tabText,
//               selectedTab === tab && { color: 'white', fontWeight: '700' },
//             ]}>
//               {tab}
//             </Text>
//           </TouchableOpacity>
//         ))}
//       </View> */}

//       {/* Result count */}
//       <Text style={styles.resultText}>
//         {filteredData.length < 10 ? "0" : ""}
//         {filteredData.length} Result{filteredData.length !== 1 ? "s" : ""}
//       </Text>

//       {/* Table Header */}
//       <View style={styles.tableHeader}>
//         <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Time</Text>
//         <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Description</Text>
//         <Text style={[styles.tableHeaderCell, { flex: 2 }]}>
//           Feed Dispensed (%)
//         </Text>
//       </View>

//       {/* Schedule list */}
//       <FlatList
//         data={filteredData}
//         keyExtractor={(item) => item.id}
//         renderItem={({ item }) => (
//           <View style={styles.tableRow}>
//             <Text style={[styles.tableCell, { flex: 1 }]}>{item.time}</Text>
//             <Text style={[styles.tableCell, { flex: 2 }]}>
//               {item.description}
//             </Text>
//             <Text style={[styles.tableCell, { flex: 2 }]}>
//               {item.feedPercent}
//             </Text>
//           </View>
//         )}
//       />
//     </SafeAreaView>
//   );
// };

// const blueColor = "#214DE0";

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#D9E4F9",
//     paddingHorizontal: 15,
//     paddingTop: 15,
//   },
//   headerRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 15,
//   },
//   backButton: {
//     backgroundColor: "white",
//     width: 40,
//     height: 40,
//     borderRadius: 15,
//     justifyContent: "center",
//     alignItems: "center",
//     marginRight: 10,
//   },
//   searchInput: {
//     backgroundColor: "white",
//     borderRadius: 15,
//     flex: 1,
//     height: 40,
//     paddingHorizontal: 15,
//     fontSize: 14,
//   },
//   iconButton: {
//     backgroundColor: "#232F63",
//     width: 40,
//     height: 40,
//     borderRadius: 15,
//     marginLeft: 10,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   tabsRow: {
//     flexDirection: "row",
//     marginBottom: 15,
//   },
//   tab: {
//     marginRight: 15,
//   },
//   tabSelected: {
//     backgroundColor: blueColor,
//     borderRadius: 20,
//     paddingVertical: 6,
//     paddingHorizontal: 14,
//   },
//   tabText: {
//     fontSize: 16,
//     fontWeight: "500",
//     color: "#2F2F2F",
//   },
//   resultText: {
//     fontWeight: "700",
//     fontSize: 14,
//     marginBottom: 8,
//   },
//   tableHeader: {
//     flexDirection: "row",
//     backgroundColor: blueColor,
//     borderRadius: 24,
//     paddingVertical: 10,
//     paddingHorizontal: 15,
//     marginBottom: 16,
//   },
//   tableHeaderCell: {
//     color: "white",
//     fontWeight: "700",
//     fontSize: 14,
//   },
//   tableRow: {
//     flexDirection: "row",
//     backgroundColor: "white",
//     paddingVertical: 12,
//     paddingHorizontal: 15,
//     borderRadius: 20,
//     marginBottom: 15,
//   },
//   tableCell: {
//     fontWeight: "600",
//     fontSize: 14,
//     color: blueColor,
//   },
// });

// export default ScheduleOnlyScreen;
import React, { useState, useEffect } from "react";
import {
  FlatList,
  SafeAreaView,
  TextInput,
  StyleSheet,
  Button,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import mqtt from "mqtt";

const client = mqtt.connect("ws://broker.emqx.io:8083/mqtt", {
  clientId: "rn_fish_" + Math.random().toString(16).substr(2, 8),
});

const ScheduleOnlyScreen = () => {
  const [searchText, setSearchText] = useState("");
  const [schedules, setSchedules] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    client.on("connect", () => console.log("MQTT Connected"));
    return () => client.end();
  }, []);

  // 🔥 Tambah + kirim langsung
  const addScheduleAndSend = (date) => {
    const hour = date.getHours();
    const minute = date.getMinutes();

    const formattedTime =
      hour.toString().padStart(2, "0") +
      ":" +
      minute.toString().padStart(2, "0");

    const newSchedule = {
      id: Date.now().toString(),
      time: formattedTime,
      hour,
      minute,
    };

    setSchedules((prev) => {
      const updated = [...prev, newSchedule];

      // SORT
      updated.sort((a, b) => {
        if (a.hour !== b.hour) return a.hour - b.hour;
        return a.minute - b.minute;
      });

      // ✅ Kirim ke ESP32
      if (client.connected) {
        client.publish(
          "feed/schedule",
          JSON.stringify({ schedules: updated })
        );
      }

      return updated;
    });
  };

  // 🔥 Hapus + kirim ulang
  const deleteSchedule = (id) => {
    setSchedules((prev) => {
      const updated = prev.filter((item) => item.id !== id);

      if (client.connected) {
        client.publish(
          "feed/schedule",
          JSON.stringify({ schedules: updated })
        );
      }

      return updated;
    });
  };

  const filteredData = schedules.filter((item) =>
    item.time.includes(searchText)
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>SCHEDULE</Text>

      <View style={{ padding: 20}}>
        <TouchableOpacity style={styles.addSchedule} onPress={() => setShowPicker(true)}><Text style={{ color: "white", fontWeight: "700" }}>
                Add Schedule</Text></TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            value={time}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={(event, selectedDate) => {
  setShowPicker(false);

  if (event.type === "set" && selectedDate) {
    setTime(selectedDate);
    addScheduleAndSend(selectedDate);
  }
}}
          />
        )}
      </View>

      <View style={styles.headerRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <Text style={styles.resultText}>
        {filteredData.length} Result
      </Text>

      {/* Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Time</Text>
        <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Action</Text>
      </View>

      {/* List */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>
              {item.time}
            </Text>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteSchedule(item.id)}
            >
              <Text style={{ color: "white", fontWeight: "700" }}>
                Hapus
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const blueColor = "#214DE0";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#D9E4F9",
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  title: {
    fontWeight: "700",
    fontSize: 30,
    textAlign: "center",
    color: blueColor,
    marginVertical: 20,
  },
  headerRow: {
    flexDirection: "row",
    marginBottom: 15,
  },
  searchInput: {
    backgroundColor: "white",
    borderRadius: 15,
    flex: 1,
    height: 40,
    paddingHorizontal: 15,
  },
  resultText: {
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: blueColor,
    borderRadius: 24,
    padding: 10,
    marginBottom: 16,
  },
  tableHeaderCell: {
    color: "white",
    fontWeight: "700",
  },
  tableRow: {
    flexDirection: "row",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 20,
    marginBottom: 10,
    alignItems: "center",
  },
  tableCell: {
    fontWeight: "600",
    color: blueColor,
  },
  deleteButton: {
    backgroundColor: "red",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  addSchedule: {
    alignItems:'center',
    alignSelf:'center',
    backgroundColor: blueColor,
    width: 120,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
});

export default ScheduleOnlyScreen;