import { useState, useEffect } from "react";
import { db } from "./firebase";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";

function Admin() {

    const [notice, setNotice] = useState("");
    const [selectedBuilding, setSelectedBuilding] = useState("409");
    const [buildingData, setBuildingData] = useState(null);
    const [editData, setEditData] = useState(null);
    const [newRoom, setNewRoom] = useState("");
    const [password, setPassword] = useState("");
    const [isLoggedIn, setIsLoggedIn] = useState(false);



    async function saveNotice() {
        await setDoc(
            doc(db, "notice", "all"),
            {
                message: notice,
            }
        );

        alert("공지 저장 완료!");
    }
    useEffect(() => {
        async function loadNotice() {
            const docRef = doc(db, "notice", "all");
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setNotice(docSnap.data().message);
            }
        }

        loadNotice();
    }, []);

    async function saveBuilding() {
        await setDoc(
            doc(db, "buildings", selectedBuilding),
            editData
        );

        alert("동 정보 저장 완료!");
    }
    async function resetChecks() {
        const rooms = editData.rooms.map((room) => ({
            ...room,
            checked: false,
        }));

        await updateDoc(
            doc(db, "buildings", selectedBuilding),
            { rooms }
        );

        alert("체크 초기화 완료!");
    }
    function addRoom() {
        if (!newRoom.trim()) return;

        const newItem = {
            id: Date.now(),
            room: newRoom,
            memo: "",
            checked: false,
        };


        setEditData({
            ...editData,
            rooms: [...editData.rooms, newItem],
        });

        setNewRoom("");
    }
    function deleteRoom(roomId) {
        setEditData({
            ...editData,
            rooms: editData.rooms.filter(
                (room) => room.id !== roomId
            ),
        });
    }
    useEffect(() => {
        async function loadBuilding() {
            const docRef = doc(db, "buildings", selectedBuilding);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {

                const data = docSnap.data();

                data.rooms = (data.rooms || []).map((room) => ({
                    checked: false,
                    ...room,
                }));

                setBuildingData(data);
                setEditData(data);

            } else {
                const emptyData = {
                    lunch: 0,
                    soup: 0,
                    lohas: 0,
                    rooms: [],
                };

                await setDoc(
                    doc(db, "buildings", selectedBuilding),
                    emptyData
                );

                setBuildingData(emptyData);
                setEditData(emptyData);
            }
        }

        loadBuilding();
    }, [selectedBuilding]);

    if (!isLoggedIn) {
        return (
            <div
                style={{
                    maxWidth: "300px",
                    margin: "100px auto",
                    textAlign: "center",
                }}
            >
                <h2>관리자 로그인</h2>

                <input
                    type="password"
                    placeholder="비밀번호"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                        width: "100%",
                        height: "40px",
                        marginBottom: "10px",
                    }}
                />

                <button
                    onClick={() => {
                        if (password === "1234") {
                            setIsLoggedIn(true);
                        } else {
                            alert("비밀번호가 틀렸습니다.");
                        }
                    }}
                    style={{
                        width: "100%",
                        height: "40px",
                    }}
                >
                    로그인
                </button>
            </div>
        );
    }
    return (
        <div
            style={{
                maxWidth: "500px",
                margin: "0 auto",
                padding: "20px",
            }}
        >
            <h1>⚙ 관리자 페이지</h1>
            <h2>동 선택</h2>

            <select
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                style={{
                    width: "100%",
                    height: "40px",
                    marginBottom: "20px",
                }}
            >
                <option value="401">401동</option>
                <option value="402">402동</option>
                <option value="403">403동</option>
                <option value="404">404동</option>
                <option value="405">405동</option>
                <option value="406">406동</option>
                <option value="407">407동</option>
                <option value="408">408동</option>
                <option value="409">409동</option>
            </select>
            <h2>전체 공지</h2>

            <textarea
                value={notice}
                onChange={(e) => setNotice(e.target.value)}
                style={{
                    width: "100%",
                    height: "100px",
                }}
            />

            <button
                onClick={saveNotice}
                style={{
                    marginTop: "10px",
                }}
            >
                공지 저장
            </button>
            <hr style={{ marginTop: "30px", marginBottom: "30px" }} />

            <h2>현재 선택 동</h2>

            <div
                style={{
                    padding: "10px",
                    border: "1px solid gray",
                    borderRadius: "10px",
                }}
            >
                {selectedBuilding}동
            </div>
            {buildingData && (
                <div
                    style={{
                        marginTop: "20px",
                        border: "1px solid gray",
                        borderRadius: "10px",
                        padding: "10px",
                    }}
                >
                    <div>
                        🍱 도시락 :
                        <input
                            type="number"
                            value={editData?.lunch || 0}
                            onChange={(e) =>
                                setEditData({
                                    ...editData,
                                    lunch: Number(e.target.value),
                                })
                            }
                            style={{ width: "80px", marginLeft: "10px" }}
                        />
                    </div>
                    <div>
                        🥣 국 :
                        <input
                            type="number"
                            value={editData?.soup || 0}
                            onChange={(e) =>
                                setEditData({
                                    ...editData,
                                    soup: Number(e.target.value),
                                })
                            }
                            style={{ width: "80px", marginLeft: "10px" }}
                        />
                    </div>
                    <div>
                        🌱 로하스밀 :
                        <input
                            type="number"
                            value={editData?.lohas || 0}
                            onChange={(e) =>
                                setEditData({
                                    ...editData,
                                    lohas: Number(e.target.value),
                                })
                            }
                            style={{ width: "80px", marginLeft: "10px" }}
                        />
                    </div>
                    <div>🏠 호수 수 : {editData?.rooms.length}</div>
                    <div style={{ marginTop: "15px" }}>
                        {editData?.rooms.map((room) => (
                            <div
                                key={room.id}
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginBottom: "5px",
                                }}
                            >
                                <div>
                                    <div>🏠 {room.room}</div>

                                    <input
                                        type="text"
                                        value={room.memo}
                                        placeholder="메모 입력"
                                        onChange={(e) =>
                                            setEditData({
                                                ...editData,
                                                rooms: editData.rooms.map((r) =>
                                                    r.id === room.id
                                                        ? {
                                                            ...r,
                                                            memo: e.target.value,
                                                        }
                                                        : r
                                                ),
                                            })
                                        }
                                        style={{
                                            width: "150px",
                                            marginTop: "3px",
                                        }}
                                    />
                                </div>

                                <button
                                    onClick={() => deleteRoom(room.id)}
                                >
                                    삭제
                                </button>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: "15px" }}>
                        <input
                            type="text"
                            value={newRoom}
                            placeholder="예: 1501호"
                            onChange={(e) => setNewRoom(e.target.value)}
                            style={{
                                width: "150px",
                            }}
                        />

                        <button
                            onClick={addRoom}
                            style={{
                                marginLeft: "10px",
                            }}
                        >
                            호수 추가
                        </button>
                    </div>
                    <button
                        onClick={saveBuilding}
                        style={{
                            marginTop: "15px",
                            width: "100%",
                            height: "40px",
                        }}
                    >
                        동 정보 저장
                    </button>

                    <button
                        onClick={resetChecks}
                        style={{
                            marginTop: "10px",
                            width: "100%",
                            height: "40px",
                            backgroundColor: "#aa3333",
                        }}
                    >
                        체크 초기화
                    </button>
                </div>
            )}
        </div>
    );
}

export default Admin;