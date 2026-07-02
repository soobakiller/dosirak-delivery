import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import {
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";

const DEFAULT_VOLUNTEER_GUIDE = `기본 사용 방법
오늘 배달할 동을 눌러 주세요.
주소와 도시락 수량을 확인한 뒤 배달해 주세요.
배달을 마치면 완료 표시를 눌러 주세요.
배달 중 문제가 있으면 경고 표시를 눌러 주세요.
잘못 눌렀거나 수정이 필요하면 관리자에게 알려 주세요.

버튼 안내
□ 네모 박스: 배달 완료시 눌러 주세요. 체크 표시가 됩니다.
⚠️ 노란색 경고: 배달 중 문제가 생겼을 때 눌러 주세요.
📝 메모: 문제 내용은 동별 메모창에 남겨 주세요. 담당자가 즉시 확인할 수 있습니다.`;

function App() {
  const [firebaseData, setFirebaseData] = useState({});
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [globalNotice, setGlobalNotice] = useState("");
  const [volunteerGuide, setVolunteerGuide] = useState(DEFAULT_VOLUNTEER_GUIDE);
  const [buildings, setBuildings] = useState([]);
  const [hiddenBuildings, setHiddenBuildings] = useState([]);
  const [deliveryMemo, setDeliveryMemo] = useState("");
  const [memoSaveStatus, setMemoSaveStatus] = useState("");
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const memoSaveTimer = useRef(null);



  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "notice", "all"),
      (docSnap) => {
        if (docSnap.exists()) {
          setGlobalNotice(docSnap.data().message);
        }
      }
    );

    return () => unsubscribe();
  }, []);
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "settings", "volunteerGuide"),
      (docSnap) => {
        if (docSnap.exists()) {
          setVolunteerGuide(
            docSnap.data().content || DEFAULT_VOLUNTEER_GUIDE
          );
        } else {
          setVolunteerGuide(DEFAULT_VOLUNTEER_GUIDE);
        }
      }
    );

    return () => unsubscribe();
  }, []);
  useEffect(() => {

    const unsubscribeList = [];

    buildings.forEach((building) => {

      const buildingId =
        building.replace("동", "");

      const unsubscribe = onSnapshot(
        doc(db, "buildings", buildingId),
        (docSnap) => {

          if (docSnap.exists()) {

            setFirebaseData((prev) => ({
              ...prev,
              [`${buildingId}동`]:
                docSnap.data(),
            }));
          }
        }
      );

      unsubscribeList.push(unsubscribe);
    });

    return () => {
      unsubscribeList.forEach(
        (fn) => fn()
      );
    };

  }, [buildings]);

  useEffect(() => {

    const unsubscribe = onSnapshot(
      doc(db, "settings", "buildings"),
      (docSnap) => {

        if (docSnap.exists()) {

          setBuildings(
            (docSnap.data().list || []).map(
              (b) => `${b}동`
            )
          );
        }
      }
    );

    return () => unsubscribe();

  }, []);

  useEffect(() => {

    const unsubscribe = onSnapshot(
      doc(db, "settings", "buildingHidden"),
      (docSnap) => {

        if (docSnap.exists()) {

          setHiddenBuildings(
            docSnap.data().hidden || []
          );
        }
      }
    );

    return () => unsubscribe();

  }, []);


  useEffect(() => {

    window.history.replaceState(
      { home: true },
      ""
    );

    const handlePopState = () => {



      setSelectedBuilding(null);
    };

    window.addEventListener(
      "popstate",
      handlePopState
    );

    return () => {
      window.removeEventListener(
        "popstate",
        handlePopState
      );
    };

  }, []);

  function normalizeRoom(room) {
    return {
      checked: false,
      ...room,
      mealCount: getRoomMealCount(room),
      paused: room.paused === true,
    };
  }

  function getRoomMealCount(room) {
    return Number(room?.mealCount) === 2 ? 2 : 1;
  }

  function getMealCountsFromRooms(rooms) {
    return rooms
      .filter((room) => !room.paused)
      .reduce(
        (counts, room) => {
          const mealCount = getRoomMealCount(room);

          return {
            lunch: counts.lunch + mealCount,
            soup:
              counts.soup +
              (room.soupExcluded ? 0 : mealCount),
            lohas:
              counts.lohas +
              (room.lohasExcluded ? 0 : mealCount),
          };
        },
        {
          lunch: 0,
          soup: 0,
          lohas: 0,
        }
      );
  }

  function hasRoomHighlight(item) {
    return Boolean(
      getRoomMealCount(item) > 1 ||
      item.soupExcluded ||
      item.lohasExcluded ||
      item.specialRequest ||
      item.memo
    );
  }

  const selectedData = firebaseData[selectedBuilding] || {};
  const allRooms = [...(selectedData.rooms || [])]
    .map(normalizeRoom)
    .sort(
      (a, b) =>
        parseInt(a.room) - parseInt(b.room)
    );
  const mealCounts = getMealCountsFromRooms(allRooms);
  const currentData = {
    lunch: mealCounts.lunch,
    soup: mealCounts.soup,
    lohas: mealCounts.lohas,
    list: allRooms.filter((room) => !room.paused),
    allRooms,
    notice: selectedData.notice || "",
    deliveryMemo: selectedData.deliveryMemo || "",
  };
  const checkedRoomCount = currentData.list.filter(
    (room) => room.checked
  ).length;
  const totalRoomCount = currentData.list.length;
  useEffect(() => {
    setDeliveryMemo(currentData.deliveryMemo);
  }, [selectedBuilding, currentData.deliveryMemo]);

  useEffect(() => {
    return () => {
      if (memoSaveTimer.current) {
        clearTimeout(memoSaveTimer.current);
      }
    };
  }, []);

  async function toggleIssue(item) {

    const buildingNumber =
      selectedBuilding.replace("동", "");

    const rooms =
      currentData.allRooms.map((room) =>
        room.id === item.id
          ? {
            ...room,
            issue: !room.issue,
          }
          : room
      );

    await updateDoc(
      doc(db, "buildings", buildingNumber),
      { rooms }
    );
  }

  async function toggleCheck(item) {

    const buildingNumber =
      selectedBuilding.replace("동", "");

    const rooms =
      currentData.allRooms.map((room) =>
        room.id === item.id
          ? {
            ...room,
            checked: !room.checked,
          }
          : room
      );

    await updateDoc(
      doc(db, "buildings", buildingNumber),
      { rooms }
    );
  }

  function handleDeliveryMemoChange(value) {
    setDeliveryMemo(value);
    setMemoSaveStatus("저장 중...");

    if (memoSaveTimer.current) {
      clearTimeout(memoSaveTimer.current);
    }

    memoSaveTimer.current = setTimeout(async () => {
      try {
        const buildingNumber =
          selectedBuilding.replace("동", "");

        await updateDoc(
          doc(db, "buildings", buildingNumber),
          { deliveryMemo: value }
        );

        setMemoSaveStatus("자동 저장됨");
      } catch (error) {
        console.error(error);
        setMemoSaveStatus("저장 실패");
      }
    }, 600);
  }

  if (selectedBuilding) {
    return (
      <div
        style={{
          width: "min(440px, 100vw)",
          maxWidth: "440px",
          margin: "0 auto",
          padding: "20px",
          boxSizing: "border-box",
        }}
      >
        <button
          onClick={() => {

            window.history.back();

          }}
          style={{
            marginBottom: "20px",
          }}
        >
          ← 뒤로가기
        </button>

        <h1>{selectedBuilding}</h1>
        <div
          style={{
            border: "1px solid #666",
            borderRadius: "10px",
            boxSizing: "border-box",
            width: "100%",
            padding: "10px",
            marginBottom: "20px",
            overflowWrap: "anywhere",
            whiteSpace: "pre-line",
          }}
        >
          📢 동별 공지 : {currentData.notice}
        </div>

        <div
          style={{
            border: "1px solid gray",
            borderRadius: "10px",
            boxSizing: "border-box",
            width: "100%",
            padding: "18px",
            position: "sticky",
            top: 0,
            zIndex: 5,
            marginBottom: "20px",
            backgroundColor: "#ffffff",
            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.08)",
            fontSize: "18px",
          }}
        >
          <div>🍱 도시락 : {currentData.lunch}개</div>
          <div>🥣 국 : {currentData.soup}개</div>
          <div>🌱 로하스밀 : {currentData.lohas}개</div>
          <div>☑ 완료 : {checkedRoomCount}/{totalRoomCount}</div>
        </div>

        <div
          style={{
            border: "1px solid #7c8db5",
            borderRadius: "10px",
            boxSizing: "border-box",
            width: "100%",
            padding: "14px",
            marginBottom: "20px",
            backgroundColor: "#f7f9ff",
          }}
        >
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "bold",
            }}
          >
            배달 특이사항 메모
          </label>
          <textarea
            value={deliveryMemo}
            placeholder="배달 중 확인한 특이사항을 적어주세요."
            onChange={(e) => handleDeliveryMemoChange(e.target.value)}
            style={{
              boxSizing: "border-box",
              width: "100%",
              minHeight: "90px",
              padding: "10px",
              border: "1px solid #b8c2d8",
              borderRadius: "8px",
              resize: "vertical",
              fontSize: "16px",
              lineHeight: 1.5,
            }}
          />
          <div
            style={{
              minHeight: "20px",
              marginTop: "6px",
              color:
                memoSaveStatus === "저장 실패"
                  ? "#b00020"
                  : "#526173",
              fontSize: "13px",
            }}
          >
            {memoSaveStatus}
          </div>
        </div>

        {currentData.list.map((item) => (
          <div
            key={item.id}
            onClick={() => toggleCheck(item)}
            style={{
              position: "relative",
              width: "100%",
              border:
                item.issue
                  ? "2px solid #ef4444"
                  : hasRoomHighlight(item)
                    ? "2px solid #f59e0b"
                    : "1px solid #d1d5db",
              borderRadius: "10px",
              boxSizing: "border-box",
              minHeight: "132px",
              display: "flex",
              flexDirection: "column",
              padding: "18px",
              marginBottom: "10px",
              fontSize: "18px",
              color:
                item.checked
                  ? "#f8fafc"
                  : "#111827",
              boxShadow:
                item.issue
                  ? "0 0 0 3px rgba(239, 68, 68, 0.14)"
                  : hasRoomHighlight(item)
                    ? "0 0 0 3px rgba(245, 158, 11, 0.14)"
                    : "none",
              cursor: "pointer",


              backgroundColor:
                item.checked
                  ? "#374151"
                  : item.issue
                    ? "#fff1f2"
                    : hasRoomHighlight(item)
                    ? "#fffacd"
                    : "#ffffff",

              opacity:
                item.checked
                  ? 0.6
                  : 1,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                minHeight: "32px",
              }}
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggleCheck(item)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "22px",
                  height: "22px",
                  accentColor: "#2563eb",
                  cursor: "pointer",
                }}
              />

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: "24px",
                    textDecoration:
                      item.checked
                        ? "line-through"
                        : "none",
                  }}
                >
                  {item.room}
                </h3>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleIssue(item);
                  }}
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    width: "32px",
                    height: "32px",
                    borderRadius: "6px",
                    border: "1px solid gray",
                    cursor: "pointer",
                    backgroundColor:
                      item.issue
                        ? "#ff4444"
                        : "#ffd54f",
                  }}
                >
                  ⚠️
                </button>


              </div>
            </div>

            <div
              style={{
                marginTop: "10px",
                fontSize: "18px",
                minWidth: 0,
                flex: "1 1 auto",
                overflowWrap: "anywhere",
                paddingRight: "4px",
              }}
            >

              {item.issue && (
                <div>
                  🚨 관리자 확인 필요
                </div>
              )}

              {item.soupExcluded && (
                <div>🥣 국X</div>
              )}

              {item.lohasExcluded && (
                <div>🌱 로하스밀X</div>
              )}

              {getRoomMealCount(item) > 1 && (
                <div>🍱 {getRoomMealCount(item)}인분 제공</div>
              )}

              {item.specialRequest && (
                <div>
                  🍱 {item.specialRequest}
                </div>
              )}

              {item.memo && (
                <div
                  style={{
                    whiteSpace: "pre-wrap",
                  }}
                >
                  📝 {item.memo}
                </div>
              )}

            </div>
          </div>
        ))}

      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "400px",
        margin: "0 auto",
        padding: "20px",
      }}
    >
      <div
        style={{
          textAlign: "center",
          fontSize: "17px",
          fontWeight: "700",
          color: "#374151",
          marginTop: "8px",
          marginBottom: "8px",
        }}
      >
        고양시흰돌종합사회복지관
      </div>

      <h1
        style={{
          textAlign: "center",
          fontSize: "clamp(24px, 5vw, 36px)",
          marginBottom: "30px",
        }}
      >
        🍱 도시락 배달 봉사
      </h1>

      <div
        style={{
          marginBottom: "16px",
        }}
      >
        <button
          type="button"
          aria-expanded={isGuideOpen}
          onClick={() => setIsGuideOpen((prev) => !prev)}
          style={{
            width: "100%",
            minHeight: "52px",
            border: "1px solid #9ca3af",
            borderRadius: "10px",
            backgroundColor: "#f9fafb",
            color: "#111827",
            fontSize: "18px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          {isGuideOpen ? "사용 안내 접기 ▲" : "사용 안내 보기 ▼"}
        </button>

        {isGuideOpen && (
          <div
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: "10px",
              padding: "14px",
              marginTop: "10px",
              backgroundColor: "#f8fafc",
              fontSize: "16px",
              lineHeight: 1.7,
              color: "#111827",
            }}
          >
            {volunteerGuide.split("\n").map((line, index) => {
              const isHeading =
                line === "기본 사용 방법" ||
                line === "버튼 안내";

              return (
                <div
                  key={`${line}-${index}`}
                  style={{
                    minHeight: line ? "auto" : "10px",
                    fontWeight: isHeading ? "bold" : "normal",
                    marginTop:
                      isHeading && index > 0
                        ? "14px"
                        : 0,
                    marginBottom: isHeading ? "6px" : 0,
                  }}
                >
                  {line}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div
        style={{
          border: "1px solid orange",
          borderRadius: "10px",
          padding: "10px",
          marginBottom: "20px",
          whiteSpace: "pre-line",
        }}
      >
        📢 공지 : {globalNotice}
      </div>

      {buildings
        .filter(
          (building) =>
            !hiddenBuildings.includes(
              building.replace("동", "")
            )
        )
        .map((building) => (
          <button
            key={building}
            onClick={() => {

              window.history.pushState(
                { building },
                ""
              );

              setSelectedBuilding(building);
            }}
            style={{
              width: "100%",
              height: "60px",
              marginBottom: "10px",
              fontSize: "22px",
              borderRadius: "10px",
              cursor: "pointer",
            }}
          >
            {building}
          </button>
        ))}
    </div>
  );
}

export default App;
